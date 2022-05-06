import frappe
from frappe.desk.form.load import get_docinfo, run_onload
import requests, json
from frappe import _, msgprint, throw
from frappe.utils import cint, cstr, flt, now_datetime, getdate, nowdate
from frappe.model.mapper import get_mapped_doc
from erpnext.selling.doctype.quotation.quotation import _make_customer
from tag_workflow.tag_data import employee_company
from tag_workflow.utils.notification import sendmail, make_system_notification, share_doc
from frappe.desk.query_report import get_report_doc, generate_report_result
from frappe.desk.desktop import Workspace
from frappe import enqueue

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
def get_user_company_data(user, company):
    try:
        return frappe.db.get_list("Employee", {"user_id": user, "company": ('not in', (company))}, "company")
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
        return None

    report = get_report_doc(report_name)

    if not frappe.has_permission(report.ref_doctype, "report"):
        frappe.msgprint(_("Must have report permission to access this report."), raise_exception=True,)
        return None

    result = None
    if(report.prepared_report and not report.disable_prepared_report and not ignore_prepared_report and not custom_columns):
        if filters:
            if isinstance(filters, string_types):
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

    elif(company_type in ["Hiring", "Exclusive Hiring"]):
        order1 = f" select name,from_date,job_start_time,job_site, company, per_hour, order_status,select_job from `tabJob Order` where company = '{company}' and '{frappe.utils.nowdate()}'  between from_date and to_date  order by creation desc limit 5"
        order = frappe.db.sql(order1,as_dict=1)
        for o in order:
            result.append({"name":o['name'], "date":(str(o['from_date'].strftime("%d %b, %Y "))+' ' +str(converttime(o['job_start_time']))),"job_site": o['job_site'], "company": o['company'], "per_hour": o['per_hour'], "select_job": o['select_job']})
        return result

@frappe.whitelist()
@frappe.read_only()
def get_desktop_page(page):
    try:
        wspace = Workspace(page)
        wspace.build_workspace()
        return {
                'charts': wspace.charts,
                'shortcuts': wspace.shortcuts,
                'cards': wspace.cards,
                'onboarding': wspace.onboarding,
                'allow_customization': not wspace.doc.disable_user_customization,
                'get_order_data': get_order_data()
        }
    except DoesNotExistError:
        frappe.log_error(frappe.get_traceback())
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
                return [d['name'] for d in data1]
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
            emp.employee_gender = data['eeo_gender'] if data['eeo_gender'] in ["Male", "Female"] else ''
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

@frappe.whitelist()
def getdoc1(doctype, name, user=None):
    if not (doctype and name):
        frappe.throw('doctype and name required!')

    if not name:
        name = doctype

    if not frappe.db.exists(doctype, name):
        return []

    try:
        doc = frappe.get_doc(doctype, name)
        run_onload(doc)
        if not doc.has_permission("read") and doc.doctype != "Sales Invoice":
            frappe.flags.error_message = _('Insufficient Permission for {0}').format(frappe.bold(doctype + ' ' + name))
            raise frappe.PermissionError(("read", doctype, name))
        elif not doc.has_permission("read") and not doc.timesheets:
            frappe.flags.error_message = _('Insufficient Permission  for {0}').format(frappe.bold(doctype + ' ' + name))
            raise frappe.PermissionError(("read", doctype, name))

        doc.apply_fieldlevel_read_permissions()
        # add file list
        doc.add_viewed()
        get_docinfo(doc)
    except Exception:
        frappe.errprint(frappe.utils.get_traceback())
        raise

    doc.add_seen()
    frappe.response.docs.append(doc)

def run_onload(doc):
    doc.set("__onload", frappe._dict())
    doc.run_method("onload")

