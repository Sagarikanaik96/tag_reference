import frappe
from frappe import _


@frappe.whitelist()
def get_order_info(company1):
    try:
        cat,location, order_detail, final_list = [], [], [],[]
        com = frappe.db.get_value("Company", {"name": company1}, "organization_type")
        claim = frappe.db.sql("""select job_order from `tabClaim Order` where staffing_organization = "{}" and approved_no_of_workers != 0 order by creation desc""".format(company1), as_dict=1)

        order_detail=check_claims_order(claim,order_detail)

        assign = frappe.db.sql(""" select job_order from `tabAssign Employee` where company = "{}" and tag_status = "Approved" """.format(company1), as_dict=1)
        for a in assign:
            order_detail.append(a.job_order)
        order_details=tuple(order_detail)
        if(len(order_details)>0):
            sql  = f'select name from `tabJob Order`  where "{frappe.utils.nowdate()}"  between from_date and to_date and name in {order_details} order by creation desc'
            job_order = frappe.db.sql(sql, as_dict=1)
            for j in job_order:
                    data=check_claims(j.name,company1)
                    for d in data:
                        cat.append(d.category)
                        if d not in final_list:
                            final_list.append(d)

                    sql = "select name, lat, lng from `tabJob Site` where name = (select job_site from `tabJob Order` where name = '{}') and lat != '' and lng != ''".format(j.name)
                    data = frappe.db.sql(sql, as_dict=1)
                    for d in data:
                        location.append([d['name'], float(d['lat']), float(d['lng']), j.name])

            value = {"location": location, "order": final_list, "org_type": com,"category":set(cat)}
            return value
    except Exception as e:
        print(e)
        frappe.msgprint(frappe.get_traceback())
        return {"location": [], "order": []}


@frappe.whitelist()
def order_info(name):
    try:
        result = []
        result = frappe.db.get_list("Job Order", {"name": name}, ["select_job", "from_date", "to_date", "estimated_hours_per_day", "job_start_time", "job_site", "no_of_workers", "extra_notes", "drug_screen", "background_check", "driving_record", "shovel", "per_hour", "rate_increase", "resumes_required", "require_staff_to_wear_face_mask"])

        for r in result:
            if not r.extra_notes:
                r.update({"extra_notes": ""})

            if r.drug_screen == "None":
                r.update({"drug_screen": ""})

            if r.background_check == "None":
                r.update({"background_check": ""})

            if r.driving_record == "None":
                r.update({"driving_record": ""})

            if r.shovel == "None":
                r.update({"shovel": ""})

            if(r.job_site):
                job_site_contact = frappe.db.get_value("Job Site", {"name": r.job_site}, "job_site_contact") or ""
                r.update({"job_site_contact": job_site_contact})

        return result
    except Exception as e:
        frappe.msgprint(e)

@frappe.whitelist()
def filter_category(company,category=None,order_by=None):
    try:
        location, order_detail, final_list = [], [], []
        com = frappe.db.get_value("Company", {"name": company}, "organization_type")
        claim = frappe.db.sql("""select job_order from `tabClaim Order` where staffing_organization = "{}" and approved_no_of_workers != 0 order by creation desc""".format(company), as_dict=1)
        order_detail=check_claims_order(claim,order_detail)
        assign = frappe.db.sql(""" select job_order from `tabAssign Employee` where company = "{}" and tag_status = "Approved" """.format(company), as_dict=1)
        for a in assign:
            order_detail.append(a.job_order)

        sql = filter_data(category,order_by)
        job_order = frappe.db.sql(sql, as_dict=1)
        for j in job_order:
            if j.name in order_detail:
                data=check_claims(j.name,company)
                for d in data:
                    if d not in final_list:
                        final_list.append(d)

                sql = "select name, lat, lng from `tabJob Site` where name = (select job_site from `tabJob Order` where name = '{}') and lat != '' and lng != ''".format(j.name)
                data = frappe.db.sql(sql, as_dict=1)
                for d in data:
                    location.append([d['name'], float(d['lat']), float(d['lng']), j.name])

        value = {"location": location, "order": final_list, "org_type": com}
        return value
    except Exception as e:
        print(e)
        frappe.msgprint(frappe.get_traceback())
        return {"location": [], "order": []}

def filter_data(category,order_by):
    sql = None
    if category and order_by:
        sql = f'select name from `tabJob Order`  where "{frappe.utils.nowdate()}"  between from_date and to_date and category="{category}" and company_type="{order_by}" order by creation desc'
    elif category:
        sql = f'select name from `tabJob Order`  where "{frappe.utils.nowdate()}"  between from_date and to_date and category="{category}" order by creation desc'
    elif order_by:
        sql = f'select name from `tabJob Order`  where "{frappe.utils.nowdate()}"  between from_date and to_date and company_type="{order_by}" order by creation desc'
    return sql
def check_claims(j,company1):
    doc=frappe.get_doc('Job Order',j)
    if(doc.resumes_required==0):
        sql = "select distinct `tabJob Order`.name, category, select_job, from_date, to_date, no_of_workers, approved_no_of_workers, estimated_hours_per_day, per_hour, job_start_time from `tabJob Order`,`tabClaim Order` where `tabJob Order`.name = '{}' and `tabClaim Order`.job_order=`tabJob Order`.name ".format(j)
        data = frappe.db.sql(sql, as_dict=1)
    else:
        assign_emp = frappe.db.sql(""" select name from `tabAssign Employee` where company = "{0}" and job_order="{1}"  """.format(company1,j), as_dict=1)
        doc=frappe.get_doc('Assign Employee',assign_emp[0]['name'])
        sql = "select distinct `tabJob Order`.name, category, select_job, from_date, to_date, no_of_workers, estimated_hours_per_day, per_hour, job_start_time from `tabJob Order`,`tabAssign Employee` where `tabJob Order`.name = '{}' and `tabAssign Employee`.job_order=`tabJob Order`.name ".format(j)
        data = frappe.db.sql(sql, as_dict=1)
        emp_approved=0
        for i in range(len(doc.employee_details)):
            if(doc.employee_details[i].approved):
                emp_approved+=1
        data[0]['approved_no_of_workers']=emp_approved
    return data

def check_claims_order(claim,order_detail):
    for c in claim:
        order_detail.append(c.job_order)
    return order_detail
