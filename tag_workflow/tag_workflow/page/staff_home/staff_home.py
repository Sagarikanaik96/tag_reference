import frappe
from frappe import _


@frappe.whitelist()
def get_order_info(company):
    try:
        location = []
        order_detail = []
        com = frappe.db.get_value("Company", {"name": company}, "organization_type")
        job_order = frappe.db.sql("select name as job_order from `tabJob Order` where  name in (select job_order from `tabAssign Employee` where company='{1}' and tag_status='Approved' )and from_date='{0}'".format(frappe.utils.today(),company),as_dict=1)

        for j in job_order:
            sql = "select name, lat, lng from `tabJob Site` where name = (select job_site from `tabJob Order` where name = '{}') and lat != '' and lng != ''".format(j['job_order'])
            data = frappe.db.sql(sql, as_dict=1)
            for d in data:
                location.append([d['name'], float(d['lat']), float(d['lng']),j['job_order']])


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
