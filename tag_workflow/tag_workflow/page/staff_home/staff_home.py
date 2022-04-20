import frappe
from frappe import _


@frappe.whitelist()
def get_order_info(company1):
    try:
        cat,location, order_detail, final_list = [], [], [],[]
        com = frappe.db.get_value("Company", {"name": company1}, "organization_type")
        claim = frappe.db.sql("""select job_order from `tabClaim Order` where staffing_organization = "{}" and approved_no_of_workers != 0 order by creation desc""".format(company1), as_dict=1)

        for c in claim:
            order_detail.append(c.job_order)

        assign = frappe.db.sql(""" select job_order from `tabAssign Employee` where company = "{}" and tag_status = "Approved" """.format(company1), as_dict=1)
        for a in assign:
            order_detail.append(a.job_order)

        sql  = f'select name from `tabJob Order`  where "{frappe.utils.nowdate()}"  between from_date and to_date order by creation desc'
        job_order = frappe.db.sql(sql, as_dict=1)
        for j in job_order:
            if j.name in order_detail:
                sql = "select name, category, select_job, from_date, to_date, no_of_workers, estimated_hours_per_day, per_hour from `tabJob Order` where name = '{}'".format(j.name)
                data = frappe.db.sql(sql, as_dict=1)
                for d in data:
                    cat.append(d.category)
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

        for c in claim:
            order_detail.append(c.job_order)

        assign = frappe.db.sql(""" select job_order from `tabAssign Employee` where company = "{}" and tag_status = "Approved" """.format(company), as_dict=1)
        for a in assign:
            order_detail.append(a.job_order)

        sql = filter_data(category,order_by)
        job_order = frappe.db.sql(sql, as_dict=1)
        for j in job_order:
            if j.name in order_detail:
                sql = "select name,  category,select_job, from_date, to_date, no_of_workers, estimated_hours_per_day, per_hour from `tabJob Order` where name = '{0}'".format(j.name)
                data = frappe.db.sql(sql, as_dict=1)
                for d in data:
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