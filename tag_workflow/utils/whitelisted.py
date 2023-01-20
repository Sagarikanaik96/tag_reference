from unicodedata import name
import re
import frappe
from frappe.utils import add_years, getdate
from frappe import DoesNotExistError
from json import loads
from frappe.desk.form.load import get_docinfo, run_onload
import requests, json
from frappe import _, msgprint, throw, is_whitelisted
from frappe.utils import cint, cstr, flt, now_datetime, getdate, nowdate
from frappe.model.mapper import get_mapped_doc
from erpnext.selling.doctype.quotation.quotation import _make_customer
from tag_workflow.utils.notification import sendmail, make_system_notification, share_doc
from frappe.desk.query_report import get_report_doc, generate_report_result,get_prepared_report_result
from frappe.desk.desktop import Workspace
from frappe import enqueue
from frappe.desk.form.save import set_local_name,send_updated_docs
from six import string_types
from mimetypes import guess_type
from frappe.utils import cint
from frappe.utils.image import optimize_image
from frappe.core.doctype.user.user import User,test_password_strength,handle_password_test_fail

ALLOWED_MIMETYPES = (
	"image/png",
	"image/jpeg",
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/vnd.oasis.opendocument.text",
	"application/vnd.oasis.opendocument.spreadsheet",
	"text/plain",
)

ALLOWED_FILE_EXTENSIONS = (
    "png",
    "jpeg",
    "jpg",
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "odt",
    "ods",
    "txt",
    "csv"
)


EVENT = 'refresh_data'
#-------global var------#
item = "Timesheet Activity Cost"
order = "Sales Order"
payment = "Payment Schedule"
taxes= "Sales Taxes and Charges"
team = "Sales Team"
JO = "Job Order"
url_link="https://api.resumatorapi.com/v1/applicants/"
apikey="?apikey="
tag_gmap_key = frappe.get_site_config().tag_gmap_key or ""
exclusive_hiring="Exclusive Hiring"
no_perm='Insufficient Permission for User'
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

    def update_timesheet(doclist):
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
    update_timesheet(doclist)
    set_missing_values(source_name, doclist, customer=customer, ignore_permissions=ignore_permissions)
    return doclist


#------------JazzHR-----------#
def preparing_employee_data(data, company):
    try:
        is_emp,is_exists,total = 0,0,0
        total = len(data)
        for i in data:
            name=i['id']
            sql_data=f'SELECT EXISTS(SELECT * from `tabEmployee` WHERE employee_number="{name}");'
            sql=frappe.db.sql(sql_data,as_list=1)
            if(sql[0][0]==0):
                data=frappe.db.sql('''select name from `tabEmployee` order by name desc limit 1''',as_list=1)
                last_series_name=data[0][0]
                name=str(last_series_name).split('-')
                series_number=name[0:-1]
                series_last_no=name[-1]
                new_series_number=str(int(series_last_no)+1).rjust(len(series_last_no), '0')
                series_name_data = '-'.join(series_number)
                new_series=series_name_data+'-'+str(new_series_number)
                b_id=i['id'].strip('"')
                first_name=i['first_name'].strip('"')
                last_name=i['last_name'].strip('"')
                is_emp += 1
                my_db=f'''insert into `tabEmployee` (name,employee_number,employee_name,first_name,last_name,company,contact_number) values("{new_series}","{b_id}","{first_name} {last_name}","{first_name}","{last_name}","{company}","{i['prospect_phone']}");'''
                frappe.db.sql(my_db)
                frappe.db.commit()
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
        if(response.status_code == 200 and len(response.json()) > 0 and len(response.json()) == 100):
            data = response.json()
            enqueue("tag_workflow.utils.whitelisted.fetching_data", data=data, response=response, api_key=api_key, company=company)
            frappe.msgprint('Employees Added successfully')
        else:
            error = json.loads(response.text)['error']
            frappe.throw(_("{0}").format(error))
    except Exception as e:
        frappe.msgprint('Some Error Occur . Please Try Again')
        frappe.error_log(e, "JazzHR")
        frappe.throw(e)


#--------get user data--------#
@frappe.whitelist()
def get_user_company_data():
    try:
        print("*************************' Company data loading started... '************************************")
        all_user = frappe.db.sql("select name,company from `tabUser` where tag_user_type IN ('Staffing Admin','Hiring Admin')")
        for each in all_user:
            company = each[1]
            user = each[0]
            if company and user:
                data = [company]
                user_doc = frappe.get_doc("User",user)
                company_exists=frappe.db.get_value('Companies Assigned',{'assign_multiple_company':company , 'parent':user})
                if not company_exists:
                    user_doc.append("assign_multiple_company",{"assign_multiple_company":company})
                    user_doc.save()
                a = frappe.db.get_list("Employee", {"user_id": user, "company": ('not in', (company))}, "company")
                for i in a:
                    company_exists=frappe.db.get_value('Companies Assigned',{'assign_multiple_company':i.company , 'parent':user},'name')
                    if not company_exists:
                        user_doc.append("assign_multiple_company",{"assign_multiple_company":i.company})
                        user_doc.save()
                        data.append(i.company)

        print("*************************' Company data loading completed successfully... '************************************")
    except Exception as e:
        print(e)

import ast
import json
#--------hiring orgs data----#
@frappe.whitelist(allow_guest=True)
def get_orgs(company,employee_lis):
    try:

        try:
            employee_lis = json.loads(employee_lis)
        except Exception as e:
            vendor_ids = json.dumps(employee_lis)
            employee_lis = ast.literal_eval(vendor_ids)
        sql = """ select hiring_organization from `tabAssign Employee` where company = '{0}' """.format(company)
        data=frappe.db.sql(sql, as_list=1)
        my_data=[]
        for i in data:
            if i not in my_data:
                my_data.append(i)
        res = []
        for index,value in enumerate(my_data):
            if value[0] not in employee_lis:
                res.append(value)
        return res
    except Exception as e:
        print(e)





#-------get company users----#
@frappe.whitelist(allow_guest=True)
def get_user(company):
    user = ""
    try:
        sql = """select name from `tabUser` where company = "{0}" and enabled = 1 """.format(company)
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
        link = frappe.utils.get_link_to_form("Contract", name, label="Click Here For Signature")
        msg=f"{staff_user} from {staff_company} is requesting an electronic signature for your contract agreement."
        subject = "Signature Request"
        make_system_notification([hiring_user], msg, 'Contract', name, subject)
        site= frappe.utils.get_url().split('/')
        sitename=site[0]+'//'+site[2]
        frappe.sendmail([hiring_user], subject=subject, delayed=False, reference_doctype='Contract', reference_name=name, template="digital_signature", args = dict(sitename=sitename, subject=subject, staff_user=staff_user, staff_company=staff_company, link = link))
        share_doc("Contract", name, hiring_user)
    except Exception as e:
        print(e)
        frappe.throw(frappe.get_traceback())

#-------update lead--------#
@frappe.whitelist(allow_guest=True)
def update_lead(lead, staff_company, date, staff_user, name,hiring_signee,hiring_sign_date):
    try:
        frappe.db.set_value("Lead", lead, "status", 'Close')
        frappe.db.set_value("Contract", name, "signe_hiring", hiring_signee)
        frappe.db.set_value("Contract", name, "sign_date_hiring", hiring_sign_date)
        frappe.db.set_value("Contract", name, "docstatus", 1)

        date = date.split('-')
        new_date = date[1]+'-'+date[2]+'-'+date[0]
        message = f"Congratulations! A Hiring contract has been signed on <b>{new_date}</b> for <b>{staff_company}</b>."
        make_system_notification([staff_user], message, 'Contract', name, "Hiring Prospect signs a contract")
        site= frappe.utils.get_url().split('/')
        sitename=site[0]+'//'+site[2]
        frappe.sendmail([staff_user], subject="Hiring Prospect signs a contract", delayed=False, reference_doctype='Contract', reference_name=name, template="digital_signature", args = dict(sitename=sitename, subject="Signature Request", staff_user=staff_user, staff_company=staff_company, date=date))
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "update_lead")
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



#----------------report issue----------------#
@frappe.whitelist()
@frappe.read_only()
def run(report_name, filters=None, user=None, ignore_prepared_report=False, custom_columns=None):
    if not user:
        user = frappe.session.user
    elif user!=frappe.session.user:
        frappe.throw('Insufficient Permission for User ' + user)
    detail_filters = json.loads(filters)
    if filters!='{}' and detail_filters.get('company'):
            company_doc=frappe.get_doc('Company',detail_filters['company'])
            if not company_doc.has_permission("read"):
                frappe.throw('Insufficient Permission for Company ' + detail_filters['company'])

    report = get_report_doc(report_name)

    if not frappe.has_permission(report.ref_doctype, "report"):
        frappe.msgprint(_("Must have report permission to access this report."), raise_exception=True,)
        return None

    result = None
    if(report.prepared_report and not report.disable_prepared_report and not ignore_prepared_report and not custom_columns):
        if filters and isinstance(filters, string_types):
                filters = json.loads(filters)
                dn = filters.get("prepared_report_name")
                filters.pop("prepared_report_name", None)
        else:
            dn = ""
        result = get_prepared_report_result(report, filters, dn, user)
    else:
        result = generate_report_result(report, filters, user, custom_columns)

    result["add_total_row"] = report.add_total_row and not result.get("skip_total_row", False)

    return result

#--------------------------#
@frappe.whitelist()
def get_order_data():
    try:
        company, company_type = frappe.db.get_value("User", {"name": frappe.session.user}, ["company", "organization_type"])
        result = []
        if not company or not company_type:
            return result

        return get_company_order(company_type, company, result)
    except Exception as e:
        frappe.msgprint(e)

def get_company_order(company_type, company, result):
    if(company_type == "Staffing"):
        job_list = set()
        claim  = frappe.db.sql(''' select job_order from `tabClaim Order` where staffing_organization = "{}" and approved_no_of_workers != 0 order by creation desc'''.format(company),as_list = 1)
        for i in claim:
            job_list.add(i[0])
        assign = frappe.db.sql(''' select job_order from `tabAssign Employee` where company = "{}" and tag_status = "Approved"'''.format(company),as_list = 1)
        for i in assign:
            job_list.add(i[0])

        sqlj  = f'select name from `tabJob Order`  where "{frappe.utils.nowdate()}"  between from_date and to_date order by creation desc'
        job_order = frappe.db.sql(sqlj,as_list=1)
        for j in job_order:
            if((j[0] in job_list) and len(result) <= 5):
                date,time, job_site, company, per_hour, select_job = frappe.db.get_value(JO, {"name": j[0]}, ["from_date","job_start_time","job_site", "company", "per_hour", "select_job"])
                result.append({"name": j, "date": (str(date.strftime("%d %b, %Y "))+ ' '+str(converttime(time))), "job_site": job_site, "company": company, "per_hour": per_hour, "select_job": select_job})
        return result

    elif(company_type in ["Hiring", exclusive_hiring]):
        order1 = f'select name,from_date,job_start_time,job_site, company, per_hour, order_status,select_job,worker_filled,no_of_workers from `tabJob Order` where company = "{company}"and "{frappe.utils.nowdate()}" between from_date and to_date  order by creation desc limit 5'
        order = frappe.db.sql(order1,as_dict=1)
        for o in order:
            result.append({"name":o['name'], "date":(str(o['from_date'].strftime("%d %b, %Y "))+' ' +str(converttime(o['job_start_time']))),"job_site": o['job_site'], "company": o['company'], "per_hour": o['per_hour'], "select_job": o['select_job'],"worker_filled":o['worker_filled'],"no_of_workers":o['no_of_workers']})
        return result

@frappe.whitelist()
@frappe.read_only()
def get_desktop_page(page):
    json_data=json.loads(page)
    if '<' in json_data['title'] or '>' in json_data['title'] or '%' in json_data['title']:
        frappe.throw('Invalid Request')
    
    try:
        workspace = Workspace(loads(page))
        workspace.build_workspace()
        return {
			"charts": workspace.charts,
			"shortcuts": workspace.shortcuts,
			"cards": workspace.cards,
			"onboardings": workspace.onboardings,
			"quick_lists": workspace.quick_lists,
            "get_order_data": get_order_data()
		}
    except DoesNotExistError:
        frappe.log_error("Workspace Missing")
        return {}

#----------------------#
@frappe.whitelist()
def search_staffing_by_hiring(data=None):
    try:
        if(data):
            
            user_name = frappe.session.user
            sql = ''' select company from `tabUser` where email='{}' '''.format(user_name)
            user_comp = frappe.db.sql(sql, as_list=1)
            sql = """select distinct p.name from `tabCompany` p inner join `tabIndustry Types` c where p.name = c.parent and organization_type = "Staffing" and (p.name like '%{0}%' or c.industry_type like '%{0}%') and c.industry_type in (select industry_type from `tabIndustry Types` where parent='{1}')  """.format(data,user_comp[0][0])
            data = frappe.db.sql(sql, as_dict=1)
            exc_par = frappe.db.get_value("Company", {"name": user_comp[0][0]}, "parent_staffing")
            if(exc_par):
                data1=[]
                data1.append({"name": exc_par})
                frappe.publish_realtime(event=EVENT,user=frappe.session.user)
                return [d['name'] for d in data1]
            frappe.publish_realtime(event=EVENT,user=frappe.session.user)
            return [d['name'] for d in data]
        return []
    except Exception as e:
        print(e)
        return []



@frappe.whitelist()
def validated_primarykey(company):
    try:
        sql = """  select * from  `tabContact` where company = "{0}" AND is_primary=1 """.format(company)
        return frappe.db.sql(sql)
    except Exception as e:
        print(e)
        
from datetime import datetime
def converttime(s):
    return  datetime.strptime(str(s), '%H:%M:%S').strftime('%I:%M %p')

 
def fetching_data(data,response,api_key,company):
    try:
        count = 1
        while(len(response.json()) == 100):
            url="https://api.resumatorapi.com/v1/applicants/page/"+str(count)+apikey+api_key
            response = requests.get(url)
            count += 1
            data.extend(response.json())
        emp_data(api_key, data, company)
    except Exception as e:
        frappe.msgprint('Error Occured')
        frappe.error_log(e, "JazzHR")
        frappe.throw(e)
 
def emp_data(api_key, data, company):
    try:
        for d in data:
            try:
                if not frappe.db.exists("Employee", {"employee_number": d['id'], "company": company}):
                    url = url_link+ d['id'] + apikey + api_key
                    response = requests.get(url)
                    emp_response_data(response, company)
            except Exception as e:
                frappe.msgprint('Some Error Occured while storing data. Please try again')
                frappe.error_log(e, "JazzHR")
                frappe.throw(e)
    except Exception as e:
        frappe.msgprint('Some Error Occured. Please try again')
        frappe.error_log(e, "JazzHR")
        frappe.throw(e)

def emp_response_data(response, company):
    try:
        if(response.status_code == 200 and len(response.json())>0):
            state, city = "", ""
            zip_code = 0
            data=response.json()
            emp = frappe.new_doc("Employee")
            emp.employee_number = data['id'].strip('"')
            emp.first_name = data['first_name'].strip('"')
            emp.last_name = data['last_name'].strip('"')
            emp.company = company
            emp.contact_number = data['phone'] or ""
            emp.employee_gender = data['eeo_gender'] if data['eeo_gender'] in ["Male", "Female", "Decline to answer"] else ''
            emp.military_veteran = 1 if data['eeoc_veteran'] == 'I AM A PROTECTED VETERAN' else 0
            emp.street_address = data['address'] if data['address'] != 'Unavailable' and data['address'] != '' else ''
            emp.email = data['email'] or ""
            state, city, zip_code = emp_city_state(data)
            emp.city = city
            emp.state = state
            emp.zip_code = zip_code
            emp.save(ignore_permissions=True)
    except Exception as e:
        frappe.msgprint('Some Error Occured')
        frappe.error_log(e, "JazzHR")
        frappe.throw(e)

def emp_city_state(data):
    try:
        if((data['location']) != '(No City Provided) (No State Provided) (No Postal Code Provided)' and data['location']):
            address_data="https://maps.googleapis.com/maps/api/geocode/json?key="+tag_gmap_key+"&address="+data['location']
            state, city, zip_code = '', '', 0
            try:
                response = requests.get(address_data)
            except Exception as e:
                print(e)
                return state, city, zip_code
            if(response.status_code == 200 and len(response.json())>0 and len(response.json()['results'])>0):
                address_dt = response.json()
                state, city, zip_code = emp_zip_city(address_dt)
            return state, city, zip_code
        else:
            return '', '', 0
    except Exception as e:
        frappe.msgprint('Some Error Occured while fetching address')
        frappe.error_log(e, "JazzHR")
        print(e)
        return '', '', 0
           
def emp_zip_city(address_dt):
    try:
        state, city, zip_code = '', '', 0
        state_data = address_dt['results'][0]['address_components']
        for i in state_data:
            if 'administrative_area_level_1' in i['types']:
                state = i['long_name'] if i['long_name'] else ''
            elif 'postal_code' in i['types']:
                zip_code = i['long_name'] if i['long_name'].isdigit() else 0

        city_zip = address_dt['results'][0]['formatted_address'].split(',')
        city = city_zip[-3].strip() if len(city_zip)>2 and city_zip[-3].strip() else ''
        return state,city,zip_code
    except Exception as e:
        frappe.msgprint('Some Error Occured while fetching address')
        frappe.error_log(e, "JazzHR")
        print(e)
        return '', '', 0

@frappe.whitelist()
def update_employees_data_jazz_hr(api_key,company):
    try:
        enqueue(emp_data_update(api_key,company))
        frappe.msgprint('Employee Data Updated Successfully')
        return True

    except Exception as e:
        frappe.msgprint('Error Occured')
        frappe.error_log(e, "JazzHR")
        frappe.throw(e)
def emp_data_update(api_key,company):
    try:
        emp_list=frappe.db.sql('select employee_number from `tabEmployee` where employee_number is NOT NULL and company="{0}" and updated_once!=1'.format(company),as_list=1)
        if(len(emp_list)>0):
            for i in emp_list:
                try:
                    name=i[0]
                    sql_data=f'SELECT EXISTS(SELECT * from `tabEmployee` WHERE employee_number="{name}");'
                    sql=frappe.db.sql(sql_data,as_list=1)
                    if(sql[0][0]==1):
                        employee_doc=f'select name from `tabEmployee` where employee_number="{name}"'
                        emp_doc=frappe.db.sql(employee_doc,as_list=1)
                        emp_number=emp_doc[0][0]
                        url = url_link+name+apikey+api_key
                        response = requests.get(url)
                        if(response.status_code == 200 and len(response.json())>0):
                            data=response.json()
                            doc_emp=frappe.get_doc('Employee',emp_number)
                            updates_value(emp_number,data,doc_emp)
                except Exception as e:
                    frappe.msgprint('Some Error Occured while data updating ')
                    frappe.error_log(e, "JazzHR")
                    frappe.throw(e)
    except Exception as e:
        frappe.msgprint('Some Error Occur')

        make_system_notification([frappe.session.user], "Updation Is not Successful", 'Company', company, 'Updation Error')
        frappe.error_log(e, "JazzHR")
        frappe.throw(e)
@frappe.whitelist()
def update_single_employee(employee_id,name,comp_name,updated_once):
    try:
        if(updated_once!='1'):
            api_key=frappe.get_doc('Company',comp_name)
            url = url_link+employee_id+apikey+api_key.jazzhr_api_key
            response = requests.get(url)
            if(response.status_code == 200 and len(response.json())>0):
                data=response.json()
                doc_emp=frappe.get_doc('Employee',name)
                updates_value(name,data,doc_emp)
            return True
        else:
            frappe.msgprint('Employee Data Already Update')

    except Exception as e:
        frappe.msgprint('Some Error Occur')
        make_system_notification([frappe.session.user], "Updation Is not Successful", 'Company', comp_name, 'Updation Error')

        frappe.error_log(e, "JazzHR")
        frappe.throw(e)
def updates_value(name,data,doc_emp):
    try:
        if('eeo_gender' in data.keys()):
            state,city,zip_code=doc_emp.state,doc_emp.city,doc_emp.zip
            employee_gender,military_veteran,street_address,contact_number,email,state,city,zip_code=employee_basic_details(data,doc_emp)
            state,zip_code,city=emp_address_detail(data,doc_emp)
            state=state if doc_emp.state is None else doc_emp.state
            city=city if doc_emp.city is None or len(doc_emp.city)==0 else doc_emp.city
            zip_code=zip_code if doc_emp.zip is None or doc_emp.zip==0 else doc_emp.zip
            d=f'update `tabEmployee` set employee_gender="{employee_gender}",military_veteran="{military_veteran}",street_address="{street_address}",contact_number="{contact_number}",email="{email}",zip={zip_code},state="{state}",city="{city}",updated_once=1  where name="{name}"'
            frappe.db.sql(d)
            frappe.db.commit()
    except Exception as e:
        frappe.msgprint('Some Error Occured while fetching details')
        frappe.error_log(e, "JazzHR")
        frappe.throw(e)
 
def employee_basic_details(data,doc_emp):
    try:
        employee_gender=data['eeo_gender'] if doc_emp.employee_gender is None and data['eeo_gender'] else doc_emp.employee_gender
        military_veteran=1 if data['eeoc_veteran']=='I AM A PROTECTED VETERAN' else doc_emp.military_veteran
        street_address=data['address'] if doc_emp.street_address is None or len(doc_emp.street_address)==0 and data['address']!='' and data['address']!='Unavailable'  else doc_emp.street_address
        contact_number=data['phone'] if doc_emp.contact_number is None or len(doc_emp.contact_number)==0 else doc_emp.contact_number
        email=data['email'] if doc_emp.email is None or len(doc_emp.email)==0 else doc_emp.email
        state=doc_emp.state
        city=doc_emp.city
        zip_code=doc_emp.zip
        return employee_gender,military_veteran,street_address,contact_number,email,state,city,zip_code
    except Exception as e:
        frappe.msgprint('Some Error Occured')
        frappe.error_log(e, "JazzHR")
        frappe.throw(e)
def emp_address_detail(data,doc_emp):
    try:
        state,zip_code,city='',0,''
        if(data['location'])!='(No City Provided) (No State Provided) (No Postal Code Provided)':
            address_data="https://maps.googleapis.com/maps/api/geocode/json?key="+tag_gmap_key+"&address="+data['location']
            response = requests.get(address_data)
            if(response.status_code == 200 and len(response.json())>0 and len(response.json()['results'])>0):
                address_dt=response.json()
                address_dt['results'][0]['formatted_address']
                state_data=address_dt['results'][0]['address_components']
                state,zip_code=state_zip(state_data,doc_emp)
                city_zip=address_dt['results'][0]['formatted_address'].split(',')
                city=city_zip[-3].strip() if len(city_zip)>2 and city_zip[-3].strip() else ''
        else:
            city,state,zip_code='','',0
        return state,zip_code,city
    except Exception as e:
        frappe.msgprint('Some Error Occured while fetching address details')
        frappe.error_log(e, "JazzHR")
        frappe.throw(e)
def state_zip(state_data,doc_emp):
    try:
        state,zip_code=doc_emp.state,doc_emp.zip
        for i in state_data:
            if 'administrative_area_level_1' in i['types']:
                state=i['long_name'] if i['long_name'] else ''
            elif 'postal_code' in i['types']:
                zip_code=i['long_name'] if i['long_name'].isdigit() else 0
        return state,zip_code
    except Exception as e:
        frappe.msgprint('Some Error Occured while fetching state details')
        frappe.error_log(e, "JazzHR")
        frappe.throw(e)

@frappe.whitelist()
def get_staffing_company_invoices():
    try:
        data = get_staffing_company_list()
        comps = data.split('\n')
        companies = frappe.db.get_list('Sales Invoice',filters={'company':['in',comps],'status':['!=','Cancelled']},fields=['distinct(company)'])
        if len(companies)>0:
            final_data=[c['company'] for c in companies]
            return "\n".join(final_data)
        else:
            return []
    except Exception as e:
        frappe.log_error(e,'Company error')
        return  []

def run_onload(doc):
    doc.set("__onload", frappe._dict())
    doc.run_method("onload")

@frappe.whitelist(allow_guest=True)
def get_company_job_order(user_type):
    try:
        current_user=frappe.session.user
        data = []
        if user_type=='Staffing':
            sql=f'''select name from `tabCompany` where organization_type="Hiring" or parent_staffing in (select company from `tabEmployee` where email="{current_user}") '''
            companies = frappe.db.sql(sql, as_dict=1)
            data = [c['name'] for c in companies]
            return "\n".join(data)
        elif user_type=="Hiring" or user_type==exclusive_hiring:
            sql=f''' select name,company,email from `tabEmployee` where email="{current_user}" '''
            companies = frappe.db.sql(sql, as_dict=1)
            data = [c['company'] for c in companies]
            return "\n".join(data)
        else:
            sql = """ select name from `tabCompany` where organization_type in ('Hiring','Exclusive Hiring') """
            frappe.db.sql(sql)
            companies = frappe.db.sql(sql, as_dict=1)
            data = [c['name'] for c in companies]
            return "\n".join(data)
    except Exception as e:
        print(e) 


@frappe.whitelist(allow_guest=True)
def get_organization_type(user_type):
    try:
        current_user=frappe.session.user
        data = []
        if user_type=='Staffing':
            sql=f"""select company from `tabEmployee` where user_id='{current_user}'"""
            data1=frappe.db.sql(sql, as_dict=True)
            for c in data1:
                data.append(c["company"])
            
            sql1= f"select name from `tabCompany` where parent_staffing in (select company from `tabEmployee` where email='{current_user}')"
            data2=frappe.db.sql(sql1, as_dict=True)
            for c in data2:
                data.append(c["name"])
            
            return "\n".join(data)
        elif user_type=="Hiring" or user_type==exclusive_hiring:
            sql=f''' select name,company,email from `tabEmployee` where email="{current_user}" '''
            companies = frappe.db.sql(sql, as_dict=1)
            data = [c['company'] for c in companies]

            return "\n".join(data)
        else:
            sql = """ select name from `tabCompany`"""
            frappe.db.sql(sql)
            companies = frappe.db.sql(sql, as_dict=1)
            data = [c['name'] for c in companies]

            return "\n".join(data)
    except Exception as e:
        print(e) 

@frappe.whitelist(allow_guest=True)
def get_role_profile():
    try:
        role= frappe.db.get_list('Role Profile',fields=['name'])
        data= [c['name'] for c in role]
        data.sort()
        
        return "\n".join(data)
    except Exception as e:
        print(e)

from frappe.desk.search import search_widget, build_for_autosuggest
@frappe.whitelist()
def search_link(doctype, txt, query=None, filters=None, page_length=100, searchfield=None, reference_doctype=None, ignore_user_permissions=False):
    search_widget(doctype, txt.strip(), query, searchfield=searchfield, page_length=page_length, filters=filters, reference_doctype=reference_doctype, ignore_user_permissions=ignore_user_permissions)
    temp = build_for_autosuggest(frappe.response["values"],doctype=doctype)
    if temp and temp[0]['value']=='Monday' or reference_doctype == 'Assign Employee Details':
        frappe.response['results']=temp
    else:
        frappe.response['results'] = sorted(temp, key=lambda d: d['value'].lower())
    del frappe.response["values"]

@frappe.whitelist()
def get_contract_prepared_by(contract_prepared_by):
    sql1 = ''' select organization_type from `tabUser` where email='{}' '''.format(contract_prepared_by)
    organization_type=frappe.db.sql(sql1, as_list=1)
    return organization_type

@frappe.whitelist()
def fetch_data(filter_name):
    try:
        user_data = frappe.db.get_value('User', frappe.session.user, ['organization_type', 'company'])
        if user_data[0] == 'Hiring' or user_data[0] == 'Exclusive Hiring':
            condition = '''AND AE.hiring_organization = "{0}"'''.format(user_data[1])
        elif user_data[0] == 'TAG' or frappe.session.user == 'Administrator':
            condition = ''
        if filter_name == 'emp_id':
            sql = '''SELECT AED.employee AS emp_id FROM `tabAssign Employee` AS AE,`tabAssign Employee Details` AS AED, `tabJob Order` AS JO  WHERE AED.approved = CASE WHEN JO.resumes_required=1 THEN 1 ELSE 0 END AND AE.name = AED.parent AND AE.tag_status = "Approved" AND JO.name = AE.job_order {0} GROUP BY AED.employee'''.format(condition)
        elif filter_name == 'emp_name':
            sql = '''SELECT AED.employee_name as emp_name FROM `tabAssign Employee` AS AE,`tabAssign Employee Details` AS AED, `tabJob Order` AS JO  WHERE AED.approved = CASE WHEN JO.resumes_required=1 THEN 1 ELSE 0 END AND AE.name = AED.parent AND AE.tag_status = "Approved" AND JO.name = AE.job_order {0} GROUP BY AED.employee_name'''.format(condition)
        elif filter_name == 'company':
            sql = '''SELECT AE.company AS company FROM `tabAssign Employee` AS AE,`tabAssign Employee Details` AS AED, `tabJob Order` AS JO  WHERE AED.approved = CASE WHEN JO.resumes_required=1 THEN 1 ELSE 0 END AND AE.name = AED.parent AND AE.tag_status = "Approved" AND JO.name = AE.job_order {0} GROUP BY AE.company'''.format(condition)
        elif filter_name == 'job_order':
            sql = '''SELECT AE.job_order AS job_order FROM `tabAssign Employee` AS AE,`tabAssign Employee Details` AS AED, `tabJob Order` AS JO  WHERE AED.approved = CASE WHEN JO.resumes_required=1 THEN 1 ELSE 0 END AND AE.name = AED.parent AND AE.tag_status = "Approved" AND JO.name = AE.job_order {0} GROUP BY AE.job_order'''.format(condition)
        else:
            sql = '''SELECT DISTINCT AE.job_category AS job_title FROM `tabAssign Employee` AS AE,`tabAssign Employee Details` AS AED, `tabJob Order` AS JO  WHERE AED.approved = CASE WHEN JO.resumes_required=1 THEN 1 ELSE 0 END AND AE.name = AED.parent AND AE.tag_status = "Approved" AND JO.name = AE.job_order {0} ORDER BY AE.job_category'''.format(condition)
        return frappe.db.sql(sql, as_list=True)
    except Exception as e:
        frappe.msgprint(e, 'Employment History Filter: Fetch Data Error')

def check_password(user, old_password):
    check_user_password = User.find_by_credentials(user, old_password)
    return check_user_password['is_authenticated']

def check_password_policy(new_password):
    result = test_password_strength(new_password)
    feedback = result.get("feedback", None)
    if feedback and not feedback.get("password_policy_validation_passed", False):
        handle_password_test_fail(feedback)

def validate_passwords(user, old_password, new_password, doc):
    if frappe.session.user == user:
        if old_password and not new_password:
            frappe.throw('New password is required')
        elif not old_password and  new_password:
            frappe.throw('Old password is required')
        elif old_password and new_password and (old_password == new_password):
            frappe.throw('Old and new password can not be same')
        elif old_password:
            if not check_password(user, old_password):
                frappe.throw("Old password is incorrect")
            else:
                check_password_policy(new_password)
                doc.old_password = None
                doc.save()
    elif check_password(user, new_password):
        frappe.throw("Old and new password can not be same")
    else:
        check_password_policy(new_password)
        doc.save()

@frappe.whitelist()
def savedocs(doc, action):
    """save / submit / update doclist"""
    try:
        #if '__islocal' in json.loads(doc):
        doc_dict = json.loads(doc)
        doc = frappe.get_doc(doc_dict)
        set_local_name(doc)
        if '__islocal' in doc_dict and frappe.session.user!=doc.owner:
            frappe.throw('Invalid owner')
            
        doc.docstatus = {"Save":0, "Submit": 1, "Update": 1, "Cancel": 2}[action]
        if doc.docstatus==1:
            doc.submit()
        else:
            if doc.doctype == "User":
                check_user = frappe.db.sql("select * from `tabUser` where  name='{0}'".format(doc_dict["email"]))
                new_password = doc_dict["new_password"]
                if check_user:
                    old_password = doc_dict.get("old_password")
                    validate_passwords(user=doc_dict["email"],
                                    old_password=old_password,
                                    new_password=new_password,
                                    doc=doc)
                else:
                    check_password_policy(new_password)
                    doc.save()
            else:
                doc.save()
        run_onload(doc)
        send_updated_docs(doc)
        frappe.msgprint(frappe._("Saved"), indicator='green', alert=True)

    except Exception:
        frappe.errprint(frappe.utils.get_traceback())
        raise

@frappe.whitelist(methods=['POST', 'PUT'])
def save(doc):
	'''Update (save) an existing document

	:param doc: JSON or dict object with the properties of the document to be updated'''
	if isinstance(doc, string_types):
		doc = json.loads(doc)
	if '__islocal' in doc and frappe.session.user!=doc['owner']:
		frappe.throw('Invalid owner')
	doc = frappe.get_doc(doc)
	doc.save()

	return doc.as_dict()

@frappe.whitelist()
def get_onboarding_details(parent, parenttype):
	return frappe.get_all(
		"Employee Boarding Activity",
		fields=[
			"activity_name",
			"role",
			"user",
			"required_for_employee_creation",
			"description",
			"task_weight",
			"begin_on",
			"duration",
            "document_required",
            "document",
            "attach"
		],
		filters={"parent": parent, "parenttype": parenttype},
		order_by="idx",
	)

@frappe.whitelist()
def get_retirement_date(date_of_birth=None):
	if date_of_birth:
		try:
			retirement_age = cint(frappe.db.get_single_value("HR Settings", "retirement_age") or 120)
			dt = add_years(getdate(date_of_birth), retirement_age)
			return dt.strftime("%Y-%m-%d")
		except ValueError:
			# invalid date
			return

import re
@frappe.whitelist(allow_guest=True)
def upload_file():
    user = None
    validation_message = "You can only upload JPG, PNG, PDF, TXT or Microsoft documents."
    if frappe.session.user == "Guest":
        if frappe.get_system_settings("allow_guests_to_upload_files"):
            ignore_permissions  = True
        else:
            raise frappe.PermissionError
    else:
        user : "User" = frappe.get_doc("User", frappe.session.user)
        ignore_permissions = False
	
    files = frappe.request.files
    is_private = frappe.form_dict.is_private
    doctype = frappe.form_dict.doctype
    docname = frappe.form_dict.docname
    fieldname = frappe.form_dict.fieldname
    file_url = frappe.form_dict.file_url
    folder = frappe.form_dict.folder or "Home"
    method = frappe.form_dict.method
    filename = frappe.form_dict.file_name
    optimize = frappe.form_dict.optimize
    content = None
    
    if "file" in files:
        upload_file  = files["file"]
        filename = upload_file.filename
        content_type = guess_type(filename)[0]
              
        split_file_name  = filename.rsplit(".",1)
        if len(split_file_name) <= 1:
            throw(_(validation_message))
        if split_file_name[1].lower() not in ALLOWED_FILE_EXTENSIONS:
            throw(_(validation_message))
        
        filename = re.sub(r"[!@#$%^&*(){};:,./<>?\|`+\s]", "", split_file_name[0]) + "." + split_file_name[1]
        content = upload_file.stream.read()
        if optimize and content_type.startswith("image/"):
            args = {"content": content, "content_type": content_type}
            if frappe.form_dict.max_width:
                args["max_width"] = int(frappe.form_dict.max_width)
            if frappe.form_dict.max_height:
                args["max_height"] = int(frappe.form_dict.max_height)
            content = optimize_image(**args)

    frappe.local.uploaded_file = content
    frappe.local.uploaded_filename = filename

    if content is not None and (
        frappe.session.user == "Guest" or (user and not user.has_desk_access())
    ):
        filetype = guess_type(filename)[0]
        if filetype not in ALLOWED_MIMETYPES:
            throw(_(validation_message))

    if method:
        method = frappe.get_attr(method)
        is_whitelisted(method)
        return method()

    else:
        return frappe.get_doc(
			{
				"doctype": "File",
				"attached_to_doctype": doctype,
				"attached_to_name": docname,
				"attached_to_field": fieldname,
				"folder": folder,
				"file_name": filename,
				"file_url": file_url,
				"is_private": cint(is_private),
				"content": content,
			}
		).save(ignore_permissions=ignore_permissions)
	

queue_prefix = 'insert_queue_for_'

@frappe.whitelist()
def deferred_insert(doctype, records):
	records_json=json.loads(records)
	if records_json[0]['user']!=frappe.session.user:
		frappe.throw('Invalid request')
	frappe.cache().rpush(queue_prefix + doctype, records)

@frappe.whitelist()
def set_seen_value(value, user):
    if frappe.session.user==user:   	
        frappe.db.set_value('Notification Settings', user, 'seen', value, update_modified=False)
    else:
        frappe.throw(no_perm) 

@frappe.whitelist()
def mark_as_read(room):
    """Mark the message as read
    Args:
        room (str): Room's name.
    """
    members = frappe.db.get_value('Chat Room', {'name':room}, ['members'])
    if frappe.session.user in members:
        frappe.enqueue('chat.utils.update_room', room=room,
                    is_read=1, update_modified=False)
    else:
        frappe.throw(no_perm)

@frappe.whitelist(allow_guest=True)
def set_typing(room, user, is_typing, is_guest):
    """Set the typing text accordingly
    Args:
        room (str): Room's name.
        user (str): Sender who is typing.
        is_typing (bool): Whether user is typing.
        is_guest (bool): Whether user is guest or not.
    """
    if user==frappe.session.user:
        result = {
            'room': room,
            'user': user,
            'is_typing': is_typing,
            'is_guest': is_guest
        }
        event = room + ':typing'
        frappe.publish_realtime(event=event,message=result)
    else:
        frappe.throw(no_perm)
