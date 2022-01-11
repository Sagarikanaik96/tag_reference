import frappe
from frappe import _


@frappe.whitelist()
def get_order_info(company):
    try:
        location = []
        order_detail = []
        job_order = frappe.db.get_list("Assign Employee", {"company": company, "tag_status": "Approved"}, "job_order")

        for j in job_order:
            sql = "select name, lat, lng from `tabJob Site` where name = (select job_site from `tabJob Order` where name = '{}') and lat != '' and lng != ''".format(j['job_order'])
            data = frappe.db.sql(sql, as_dict=1)
            for d in data:
                location.append([d['name'], float(d['lat']), float(d['lng'])])


        for o in job_order:
            sql = "select select_job, from_date, to_date  estimated_hours_per_day, no_of_workers from `tabJob Order` where name = '{}'".format(o['job_order'])
            data = frappe.db.sql(sql, as_dict=1)
            for d in data:
                order_detail.append(d)

        value = {"location": location, "order": order_detail}
        return value
    except Exception as e:
        print(e)
        frappe.msgprint(frappe.get_traceback())
        return {"location": [], "order": []}
