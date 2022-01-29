import frappe
import requests, json
from frappe import _, msgprint, throw
from frappe.utils import cint, cstr, flt, now_datetime, getdate, nowdate
from frappe.model.mapper import get_mapped_doc
from erpnext.selling.doctype.quotation.quotation import _make_customer
from tag_workflow.utils.notification import sendmail, make_system_notification, share_doc

#-------global var------#
item = "Timesheet Activity Cost"
order = "Sales Order"
payment = "Payment Schedule"
taxes= "Sales Taxes and Charges"
team = "Sales Team"
#-----------------------------------#
def set_missing_values(source, target, customer=None, ignore_permissions=True):
    if customer:
        target.customer = customer.name
        target.customer_name = customer.customer_name
    target.ignore_pricing_rule = 1
    target.flags.ignore_permissions = ignore_permissions
    target.run_method("set_missing_values")
    target.run_method("calculate_taxes_and_totals")

def update_item(obj, target, source_parent):
    target.stock_qty = flt(obj.qty) * flt(obj.conversion_factor)

#----------- sales order -----------#
@frappe.whitelist()
def make_sales_order(source_name, target_doc=None):
    quotation = frappe.db.get_value("Quotation", source_name, ["transaction_date", "valid_till"], as_dict = 1)
    if quotation.valid_till and (quotation.valid_till < quotation.transaction_date or quotation.valid_till < getdate(nowdate())):
        frappe.throw(_("Validity period of this quotation has ended."))
    return _make_sales_order(source_name, target_doc)


def _make_sales_order(source_name, target_doc=None, ignore_permissions=True):
    customer = _make_customer(source_name, ignore_permissions)
    
    doclist = get_mapped_doc("Quotation", source_name, {
        "Quotation": {"doctype": order, "validation": {"docstatus": ["=", 1]}},
        "Quotation Item": {"doctype": "Sales Order Item", "field_map": {"rate": "rate", "amount": "amount", "parent": "prevdoc_docname", "name": "quotation_item_detail",},"postprocess": update_item},
        taxes: {"doctype": taxes, "add_if_empty": True},
        team: {"doctype": team, "add_if_empty": True},
        payment: {"doctype": payment, "add_if_empty": True}
    }, target_doc, set_missing_values, ignore_permissions=ignore_permissions)
    set_missing_values(source_name, doclist, customer=customer, ignore_permissions=ignore_permissions)
    return doclist

#--------- sales invoice -----------#
@frappe.whitelist()
def make_sales_invoice(source_name, target_doc=None):
    return _make_sales_invoice(source_name, target_doc)

def _make_sales_invoice(source_name, target_doc=None, ignore_permissions=True):
    def customer_doc(source_name):
        customer = frappe.db.get_value(order, source_name, "customer")
        return frappe.get_doc("Customer", customer)

    def update_timesheet(source, doclist, target):
        total_amount = 0
        total_hours = 0
        job_order = frappe.db.get_value(order, source_name, "job_order")
        timesheet = frappe.db.get_list("Timesheet", {"job_order_detail": job_order, "docstatus": 1}, ["name"])
        
        for time in timesheet:
            sheet = frappe.get_doc("Timesheet", {"name": time.name})
            total_amount += sheet.total_billable_amount
            total_hours += sheet.total_billable_hours

            for logs in sheet.time_logs:
                activity = {"activity_type": logs.activity_type, "billing_amount": logs.billing_amount, "billing_hours": logs.billing_hours, "time_sheet": logs.parent, "from_time": logs.from_time, "to_time": logs.to_time, "description": sheet.employee}
                doclist.append("timesheets", activity)

        doclist.total_billing_amount = total_amount
        doclist.total_billing_hours = total_hours
        timesheet_item = {"item_code": item, "item_name": item, "description": item, "uom": "Nos", "qty": 1, "stock_uom": 1, "conversion_factor": 1, "stock_qty": 1, "rate": total_amount, "amount": total_amount}
        doclist.append("items", timesheet_item)

    def make_invoice(source_name, target_doc):
        return get_mapped_doc(order, source_name, {
            order: {"doctype": "Sales Invoice", "validation": {"docstatus": ["=", 1]}},
            "Sales Order Item": {"doctype": "Sales Invoice Item", "field_map": {"rate": "rate", "amount": "amount", "parent": "sales_order", "name": "so_detail",}, "postprocess": update_item},
            taxes: {"doctype": taxes, "add_if_empty": True},
            team: {"doctype": team, "add_if_empty": True},
            payment: {"doctype": payment,"add_if_empty": True}
        }, target_doc, set_missing_values, ignore_permissions=ignore_permissions)

    customer = customer_doc(source_name)
    doclist = make_invoice(source_name, target_doc)
    update_timesheet(source_name, doclist, target_doc)
    set_missing_values(source_name, doclist, customer=customer, ignore_permissions=ignore_permissions)
    return doclist


#------------JazzHR-----------#
def preparing_employee_data(data, company):
    try:
        is_emp,is_exists,total = 0,0,0
        total += 1
        if not frappe.db.exists("Employee", {"first_name": data['first_name'], "last_name": data['last_name'], "company": company}):
            employee = frappe.get_doc(dict(doctype="Employee", first_name=data['first_name'], last_name=data['last_name'], company=company, status="Active"))
            employee.save(ignore_permissions=True)
            is_emp += 1
        else:
            is_exists += 1
        return "Total <b>"+str(total)+"</b> records found, out of these newly created recored are <b>"+str(is_emp)+"</b> and <b>"+str(is_exists)+"</b> already exists."
    except Exception as e:
        frappe.throw(e)


@frappe.whitelist()
def make_jazzhr_request(api_key, company):
    try:
        url = "https://api.resumatorapi.com/v1/applicants?apikey="+api_key
        response = requests.get(url)
        if(response.status_code == 200):
            data = response.json()
            result = preparing_employee_data(data, company)
            return result
        else:
            error = json.loads(response.text)['error']
            frappe.throw(_("{0}").format(error))
    except Exception as e:
        frappe.error_log(e, "JazzHR")
        frappe.throw(e)


#--------get user data--------#
@frappe.whitelist()
def get_user_company_data(user, company):
    try:
        return frappe.db.get_list("Employee", {"user_id": user, "company": ('not in', (company))}, "company")
    except Exception as e:
        print(e)


#--------hiring orgs data----#
@frappe.whitelist(allow_guest=True)
def get_orgs(company):
    try:
        sql = """ select hiring_organization from `tabAssign Employee` where company = '{0}' """.format(company)
        data=frappe.db.sql(sql, as_list=1)
        my_data=[]
        for i in data:
            if i not in my_data:
                my_data.append(i)
        return my_data
    except Exception as e:
        print(e)

#-------get company users----#
@frappe.whitelist(allow_guest=True)
def get_user(company):
    user = ""
    try:
        sql = """select name from `tabUser` where company = '{0}' and enabled = 1 """.format(company)
        users = frappe.db.sql(sql, as_dict=1)
        for u in users:
            user += "\n"+str(u.name)

        return user
    except Exception as e:
        print(e)
        return user

#-----------request signature----------------#
@frappe.whitelist()
def request_signature(staff_user, staff_company, hiring_user, name):
    try:
        link = frappe.utils.get_link_to_form("Contract", name, label='{{ _("Click here for signature") }}')
        link = '<p style="margin: 15px 0px;">'+link+'</p>'
        template = frappe.get_template("templates/emails/digital_signature.html")
        message = template.render({"staff_user": staff_user, "staff_company": staff_company, "link": link, "date": ""})
        msg=f"{staff_user} from {staff_company} is requesting an electronic signature for you contract agreement."
        make_system_notification([hiring_user], msg, 'Contract', name, "Signature Request")
        sendmail([hiring_user], message, "Signature Request", 'Contract', name)
        share_doc("Contract", name, hiring_user)
    except Exception as e:
        print(e)
        frappe.throw(frappe.get_traceback())

#-------update lead--------#
@frappe.whitelist(allow_guest=True)
def update_lead(lead, staff_company, date, staff_user, name):
    try:
        frappe.db.set_value("Lead", lead, "status", 'Close')
        template = frappe.get_template("templates/emails/digital_signature.html")
        message = template.render({"staff_user": "", "staff_company": staff_company, "link": "", "date": date})
        make_system_notification([staff_user], message, 'Contract', name, "hiring prospects signs a contract")
        sendmail([staff_user], message, "hiring prospects signs a contract", 'Contract', name)
    except Exception as e:
        frappe.error_log(frappe.get_traceback(), "update_lead")
        print(e)

#-------company list-------#
@frappe.whitelist(allow_guest=True)
def get_company_list(company_type):
    try:
        data = []
        sql = """ select name from `tabCompany` where make_organization_inactive = 0 and organization_type = '{0}' """.format(company_type)
        companies = frappe.db.sql(sql, as_dict=1)
        data = [c['name'] for c in companies]
        return "\n".join(data)
    except Exception as e:
        print(e)
        return []

#-------check timesheet-----#
@frappe.whitelist()
def check_timesheet(job_order):
    try:
        is_value = True
        if(frappe.db.exists("Timesheet", {"job_order_detail": job_order, "docstatus": 0})):
            frappe.msgprint(_("All timesheets needs to be approved for this job order"))
            is_value = False
        return is_value
    except Exception as e:
        print(e)
        return is_value


@frappe.whitelist()
def get_staffing_company_list():
    try:
        data = []
        sql = """ select name from `tabCompany` where organization_type = 'Staffing' """
        companies = frappe.db.sql(sql, as_dict=1)
        data = [c['name'] for c in companies]
        return "\n".join(data)
    except Exception as e:
        print(e)
        return []

