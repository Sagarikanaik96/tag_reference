import frappe
from frappe import _


@frappe.whitelist()
def get_order_info(company):
    try:
        location = []
        order_detail = []
        com = frappe.db.get_value("Company", {"name": company}, "organization_type")
        job_order = frappe.db.get_list("Assign Employee", {"company": company, "tag_status": "Approved"}, "job_order")

        for j in job_order:
            sql = "select name, lat, lng from `tabJob Site` where name = (select job_site from `tabJob Order` where name = '{}') and lat != '' and lng != ''".format(j['job_order'])
            data = frappe.db.sql(sql, as_dict=1)
            for d in data:
                location.append([d['name'], float(d['lat']), float(d['lng'])])


        for o in job_order:
            sql = "select name, select_job, from_date, to_date, no_of_workers, estimated_hours_per_day, per_hour from `tabJob Order` where name = '{}'".format(o['job_order'])
            data = frappe.db.sql(sql, as_dict=1)
            for d in data:
                order_detail.append(d)

        value = {"location": location, "order": order_detail, "org_type": com}
        return value
    except Exception as e:
        print(e)
        frappe.msgprint(frappe.get_traceback())
        return {"location": [], "order": []}
