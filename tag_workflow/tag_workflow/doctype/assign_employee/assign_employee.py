# Copyright (c) 2021, SourceFuse and contributors
# For license information, please see license.txt
import frappe, tag_workflow
from frappe import _
import requests, json
import googlemaps
from frappe.model.document import Document

class AssignEmployee(Document):
    pass


distance_value = {"5 miles": 5, "10 miles": 10, "20 miles": 20, "50 miles": 50}

def get_souce(location=None):
    try:
        source = []
        if(location):
            site = frappe.db.get_list("Job Site", {"name": location}, ["address", "city", "state", "zip"], ignore_permissions=True)
            for s in site:
                source = [s['address'], s['city'], s['state'], str(s['zip'])]
        return ",".join(source)
    except Exception:
        return ",".join(source)

def get_dest(dest):
    try:
        street = dest['street_address'] if dest['street_address'] else ''
        city = dest['city'] if dest['city'] else ''
        state = dest['state'] if dest['state'] else ''
        ZIP = str(dest['zip']) if dest['zip'] != 0 else ''
        return street+","+city+","+state+","+ZIP
    except Exception as e:
        print(e)
        return ''


def check_distance(emp, distance, location):
    try:
        result, source = [], []
        tag_gmap_key = frappe.get_site_config().tag_gmap_key or ""
        if not tag_gmap_key:
            frappe.msgprint(_("GMAP api key not found"))
            return ()

        gmaps = googlemaps.Client(key=tag_gmap_key)
        source = get_souce(location)
        for e in emp:
            try:
                dest = get_dest(e)
                my_dist = gmaps.distance_matrix(source, dest)
                if(my_dist['status'] == 'OK' and my_dist['rows'][0]['elements'][0]['distance']):
                    km = my_dist['rows'][0]['elements'][0]['distance']['value']/1000
                    if(km is not None and ((km*0.62137) <= distance_value[distance] or km == 0)):
                        result.append((e['name'], e['employee_name']))
            except Exception as e:
                print(e)
                continue
        return tuple(result)
    except Exception as e:
        print(e, "google")
        frappe.msgprint(e)
        return ()


@frappe.whitelist()
def get_employee(doctype, txt, searchfield, page_len, start, filters):
    try:
        emp_company = filters.get('emp_company')
        job_category = filters.get('job_category')
        company = filters.get('company')
        distance = filters.get('distance_radius')
        job_location = filters.get('job_location')
        job_order=filters.get('job_order')
        employee_lis = filters.get('employee_lis')
        all_employees=filters.get('all_employees')
        doc = frappe.get_doc('Job Site',job_location)
        value = ''
        for index ,i in enumerate(employee_lis):
            if index >= 1:
                value = value+"'"+","+"'"+i
            else:
                value =value+i

        if all_employees:
            sql = """
                select * from(
                select name, employee_name,CONCAT(Round(
                3959 * Acos( Least(1.0,Cos( Radians({4}) )*Cos( Radians(lat) )*Cos( Radians(lng) - Radians ({5}) )+Sin( Radians({4}) )*Sin( Radians(lat)))),1), " miles") as `distance`
                from `tabEmployee`
                where company = '{0}' and status = 'Active'
                and name NOT IN (select e.employee from `tabAssign Employee Details` e inner join `tabAssign Employee` a where a.name = e.parent and e.approved=1 and a.job_order='{7}')
                and (lat!="" or lat is Null) and (lng!="" or lng is Null)
                and user_id is Null
                and name NOT IN (select parent from `tabBlocked Employees` where blocked_from = '{1}')
                and name NOT IN (select parent from `tabDNR`  where dnr = '{1}') 
                and (name NOT IN (select parent from `tabUnsatisfied Organization` where unsatisfied_organization_name = '{1}')) 
                and name NOT IN ('{2}') and (name like '%%{3}%%' or employee_name like  '%%{3}%%')) t
                where (`distance` < {6} or `distance` is NULL) order by `distance` is NULL,`distance`*1
                """.format(emp_company, company, value, '%s' % txt,doc.lat,doc.lng,distance_value[distance],job_order)
        else:
            sql = """
                select * from(
                select name, employee_name,CONCAT(Round(
                3959 * Acos( Least(1.0,Cos( Radians({5}) )*Cos( Radians(lat) )*Cos( Radians(lng) - Radians ({6}) )+Sin( Radians({5}) )*Sin( Radians(lat)))),1), " miles") as `distance`
                from `tabEmployee`where company = '{0}'and status = 'Active' and zip!=0
                and lat!="" and lng!=""
                and name NOT IN (select e.employee from `tabAssign Employee Details` e inner join `tabAssign Employee` a where a.name = e.parent and e.approved=1 and a.job_order='{8}')
                and employee_name like '%%{4}%%' 
                and user_id is Null
                and name in (select parent from `tabJob Category` where job_category = '{1}'
                and parent NOT IN ('{3}')) 
                and name NOT IN (select parent from `tabBlocked Employees` where blocked_from = '{2}') 
                and name NOT IN (select parent from `tabDNR`  where dnr = '{2}') 
                and (name NOT IN (select parent from `tabUnsatisfied Organization` where unsatisfied_organization_name = '{2}'))and name NOT IN ('{3}')
                and (name like '%%{4}%%' or employee_name like  '%%{4}%%')) t
                where `distance` < {7} order by `distance`*1
                """.format(emp_company, job_category, company, value, '%s' % txt,doc.lat,doc.lng,distance_value[distance],job_order)
        emp = frappe.db.sql(sql)
        return emp
    except Exception as e:
        frappe.msgprint(e)
        return tuple()

@frappe.whitelist()
def worker_data(job_order):
    sql=f"select no_of_workers,worker_filled from `tabJob Order` where name='{job_order}'"
    data=frappe.db.sql(sql,as_dict=True)
    return data

@frappe.whitelist()
def approved_workers(job_order,user_email):
    sql=f"select name, staffing_organization, sum(approved_no_of_workers) as approved_no_of_workers from `tabClaim Order` where job_order='{job_order}' and staffing_organization in (select company from `tabEmployee` where user_id='{user_email}') group by staffing_organization "
    data=frappe.db.sql(sql,as_dict=True)
    sql=""" select name from `tabAssign Employee` where job_order="{0}" and company= "{1}" """.format(job_order,data[0]['staffing_organization'])
    my_assign_emp=frappe.db.sql(sql,as_list=1)
    if(len(my_assign_emp)>0):
        doc=frappe.get_doc('Assign Employee',my_assign_emp[0][0])
        if int(doc.claims_approved)!=int(data[0]['approved_no_of_workers']):
            frappe.db.set_value("Assign Employee", str(my_assign_emp[0][0]), "claims_approved", int(data[0]['approved_no_of_workers']))
    return data

@frappe.whitelist()
def check_old_value(name):
    try:
        return frappe.db.get_value("Assign Employee Details", name, "employee")
    except Exception as e:
        frappe.msgprint(e)
@frappe.whitelist()
def check_emp_available(frm):   
    try:
        data=json.loads(frm)
        company=data['company']
        job_order=data['job_order']
        emps=data['employee_details']
        my_job=frappe.get_doc('Job Order',job_order)
        job_start_date=my_job.from_date
        job_end_date=my_job.to_date
        data=f'select name,job_order from `tabAssign Employee` where company="{company}" and tag_status="Approved" and job_order in (select name from `tabJob Order` where order_status!="Completed" and ((from_date between "{job_start_date}" and "{job_end_date}") or (to_date between "{job_start_date}" and "{job_end_date}")  ))'
        my_dta=frappe.db.sql(data,as_dict=1)
        if my_dta:
            emp_lists=[]
            for i in my_dta:
                check_emp=f'select employee,employee_name,parent from `tabAssign Employee Details` where parent="{i.name}"'
                my_emp_data=frappe.db.sql(check_emp,as_dict=1)
                for j in my_emp_data:
                    emp_lists.append(j)
            l=my_emp_work(emps,emp_lists)
            z=[]
            for i in l:
                d1={}
                y=frappe.get_doc('Assign Employee',i[1])
                d1['job_order']=y.job_order
                d1['employee']=i[0]
                z.append(d1)
            return z
        else:
            return 1
    except Exception as e:
        frappe.error_log(e,'Check same order')
def my_emp_work(emps,my_emp_data):
    if emps and len(emps):
        l=[]
        for i in emps:
            for k in my_emp_data:
                if i['employee'] in k.values():
                    l.append([k['employee_name'],k['parent']])
        return l 

@frappe.whitelist()
def validate_employee(doc,method):
	job_order=frappe.get_doc('Job Order',doc.job_order)
	if job_order.is_repeat!=1:
		for employee in doc.employee_details:
			employee_doc=frappe.get_doc('Employee',employee.employee)
			if not employee_doc.has_permission("read"):
				frappe.flags.error_message = _('Insufficient Permission for {0}').format(frappe.bold('Employee' + ' ' + employee.employee_name))
