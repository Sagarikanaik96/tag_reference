# Copyright (c) 2021, SourceFuse and contributors
# For license information, please see license.txt
import frappe, tag_workflow
from frappe import _, whitelist
import requests, json
import googlemaps
from frappe.model.document import Document
jobOrder='Job Order'
AEMP ='Assign Employee'
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

@frappe.whitelist()
def add_job_title(docname):
    frappe.enqueue("add_job_title_in_background",queue="default",docname = docname,)
   
def add_job_title_to_profile(job_title, emp_data, negative_status):
    if not sum(negative_status):
        if not len(emp_data.employee_job_category):
            emp_data.job_category = job_title
        emp_data.append('employee_job_category',{'job_category':job_title})
        emp_data.save(ignore_permissions=True)
        adding_job_categories(emp_data)

@frappe.whitelist()
def adding_job_categories(emp_data):
    emp_category = emp_data.employee_job_category
    length = len(emp_category)
    title = '';	
    job_categories_list = []
    for i in range(len(emp_category)):
        job_categories_list.append(emp_category[i].job_category)
        if not emp_category[i].job_category:
            length -= 1
                    
        elif title == '':
            title = emp_category[i].job_category                  
    if length>1:
        job_categories = title + ' + ' + str(length-1)
    else:
        job_categories = title
    emp_data.job_categories = job_categories
    emp_data.job_title_filter = ",".join(job_categories_list)
    emp_data.save(ignore_permissions=True)

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
        key = emp_company+""+job_order+""+distance
        redis = frappe.cache()
        if redis.hget(key,'emp'):
            return cache_data(redis,key,employee_lis)
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
        save_data_in_redis(key,emp)
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
    sql=f"select name, staffing_organization, notes, sum(approved_no_of_workers) as approved_no_of_workers from `tabClaim Order` where job_order='{job_order}' and staffing_organization in (select company from `tabEmployee` where user_id='{user_email}')  group by staffing_organization"
    data=frappe.db.sql(sql,as_dict=True)
    sql=""" select name from `tabAssign Employee` where job_order="{0}" and company= "{1}" """.format(job_order,data[0]['staffing_organization'])
    my_assign_emp=frappe.db.sql(sql,as_list=1)
    if(len(my_assign_emp)>0):
        doc=frappe.get_doc('Assign Employee',my_assign_emp[0][0])
        if int(doc.claims_approved)!=int(data[0]['approved_no_of_workers']):
            frappe.db.set_value("Assign Employee", str(my_assign_emp[0][0]), "claims_approved", int(data[0]['approved_no_of_workers']))

    claim = frappe.db.sql(""" select notes from `tabClaim Order` where staffing_organization="{0}" and job_order="{1}" and notes !=''  order by modified desc """.format(data[0]['staffing_organization'],job_order),as_dict=1)
    if claim:
        data[0]["notes"]= claim[0]['notes']
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
        my_job=frappe.get_doc(jobOrder,job_order)
        job_start_date=my_job.from_date
        job_end_date=my_job.to_date
        pay_rate = check_pay_rate(my_job.per_hour+my_job.flat_rate, data);
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
                y=frappe.get_doc(AEMP,i[1])
                d1['job_order']=y.job_order
                d1['employee']=i[0]
                z.append(d1)
            return z, pay_rate
        else:
            return 1, pay_rate
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
    job_order=frappe.get_doc(jobOrder,doc.job_order)
    if job_order.is_repeat!=1:
        for employee in doc.employee_details:
            employee_doc=frappe.get_doc('Employee',employee.employee)
            if employee_doc.company != doc.company:
                frappe.throw('Employee does not belong to the Staffing Organization')

@frappe.whitelist()
def payrate_change(docname):
    try:
        sql = '''select data from `tabVersion` where docname="{0}" order by modified DESC'''.format(docname)
        data = frappe.db.sql(sql, as_list=1)
        print(data,"#####################################################")
        if len(data)==0:
            return 'success'
        new_data = json.loads(data[0][0]) 
        doc = frappe.get_doc(AEMP,docname)
        free_redis(doc.company,doc.job_order)
        if ('changed' not in new_data and 'row_changed' not in new_data) or len(new_data['added']) > 0 or len(new_data['removed']) > 0:
            return 'success'
        elif 'row_changed' in new_data and len(new_data['row_changed'])>0:
            for i in new_data['row_changed'][0][3]:
                if i[0] == 'employee_name':
                    return 'success'
        return 'failure'
    except Exception as e:
        print(e, frappe.get_traceback())

def check_pay_rate(total_bill_rate, data):
    try:
        emp_details = data['employee_details']
        temp = {'bill_rate': total_bill_rate}
        employees = {}
        if float(data['employee_pay_rate']) > total_bill_rate:
            temp['emp_pay_rate'] = data['employee_pay_rate']
        for i in emp_details:
            if float(i['pay_rate']) > total_bill_rate:
                employees[i['employee_name']] = i['pay_rate']
        if len(employees)>0:
            temp['employees'] = employees
        return temp
    except Exception as e:
        frappe.log_error(e, 'Check Pay Rate Pop Up Error')
        print(e, frappe.get_traceback())

@frappe.whitelist()
def update_workers_filled(job_order_name):
    try:
        frappe.enqueue('tag_workflow.tag_workflow.doctype.assign_employee.assign_employee.update_workers_filled_job', now=True, job_order_name=job_order_name)
    except Exception as e:
        print(e, frappe.get_traceback())
        frappe.log_error(e,'Workers Update')

@frappe.whitelist()
def update_workers_filled_job(job_order_name):
    try:
        worker_filled=0
        job=frappe.get_doc(jobOrder,job_order_name)
        if(job.resumes_required==0):
            emp_assigned=frappe.db.sql('select count(employee_name) as total_emp_assigned from `tabAssign Employee Details` where parent in (select name from `tabAssign Employee` where job_order="{0}") and remove_employee=0;'.format(job_order_name),as_dict=1)
            if(len(emp_assigned)):
                worker_filled=emp_assigned[0]['total_emp_assigned']
        else:
            emp_assigned=frappe.db.sql('select count(employee_name) as total_emp_assigned from `tabAssign Employee Details` where parent in (select name from `tabAssign Employee` where job_order="{0}") and remove_employee=0 and approved=1;'.format(job_order_name),as_dict=1)
            if(len(emp_assigned)):
                worker_filled=emp_assigned[0]['total_emp_assigned']
        if(int(worker_filled)!=int(job.worker_filled)):
            frappe.db.sql('update `tabJob Order` set worker_filled={0} where name="{1}"'.format(int(worker_filled),job_order_name))
            frappe.db.commit()

    except Exception as e:
        frappe.log_error(e,'Workers Update Job')

@frappe.whitelist()
def update_notes(name,notes,job_order,company):
    try:
        frappe.db.sql(""" UPDATE `tabAssign Employee` SET notes ="{0}" where job_order="{1}" and company="{2}" """.format(notes,job_order,company))
        frappe.db.commit()
        frappe.publish_realtime(event='sync_data',doctype=AEMP,docname=name)
    except Exception as e:
        print(e)

def cache_data(redis,key,employee_lis):
    try:
        data = redis.hget(key,'emp')
        if len(data)>0:
            for d in data:
                if d[0] in employee_lis:
                   data.remove(d)
            redis.hset(key,'emp',data)
            return data
    except Exception as e:
        frappe.log_error(e,'cache_data_error')

def save_data_in_redis(key,emp):
    try:
        redis = frappe.cache()
        if len(emp) and redis.hget(key,'emp')==None:
            redis.hset(key,'emp',list(emp))
    except Exception as e:
        frappe.log_error(e,'store_data _error')

@frappe.whitelist()       
def free_redis(company,job_order):
    try:
        redis = frappe.cache()
        distances =['5 miles','10 miles','20 miles','50 miles']
        for d in distances:
            key = company+""+job_order+""+d
            if redis.hget(key,'emp'):
                redis.hdel(key,'emp')
    except Exception as e:
        frappe.log_error(e,'redis error')

@frappe.whitelist()
def add_notes(company,job_order):
    try:
        return frappe.db.sql(""" select notes from `tabAssign Employee` where job_order="{0}" and company="{1}" and notes!=""  limit 1 """.format(job_order,company),as_dict=1)
    except Exception as e:
        print(e)

@frappe.whitelist()
def add_job_title_in_background(docname):
    sql=f"select employee from `tabAssign Employee Details` where parent='{docname}'"
    data=frappe.db.sql(sql,as_list=True)
    sql=f"select job_category,job_order from `tabAssign Employee` where name='{docname}'"
    new_data=frappe.db.sql(sql,as_list=True)
    job_title = new_data[0][0]
    job_order_data = frappe.get_doc('Job Order',new_data[0][1])
    status = job_order_data.order_status
    if status !="Completed":
        for emp in data:
            try:
                sql=f"select job_category from `tabJob Category` where parent='{emp[0]}'"
                categories=frappe.db.sql(sql,as_list=True)
                categories = [cat[0] for cat in categories]
                if job_title not in categories:
                    emp_data = frappe.get_doc('Employee',emp[0])
                    check_status_sql = f"select COUNT(*) from `tabDNR` where parent='{emp[0]}' and job_order='{new_data[0][1]}' UNION select COUNT(*) from `tabNo Show List` where parent='{emp[0]}' and job_order='{new_data[0][1]}' UNION select COUNT(*) from `tabUnsatisfied Organization` where parent='{emp[0]}' and job_order='{new_data[0][1]}'"
                    negative_status=frappe.db.sql(check_status_sql,as_list=True)
                    negative_status = [int(a[0]) for a in negative_status]
                    add_job_title_to_profile(job_title, emp_data, negative_status)
            except Exception:
                pass

