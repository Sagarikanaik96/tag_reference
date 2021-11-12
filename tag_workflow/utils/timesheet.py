import frappe
from frappe import _, msgprint
from frappe.share import add

@frappe.whitelist()
def send_timesheet_for_approval(employee, docname):
    try:
        user_list = frappe.db.sql(""" select parent from `tabHas Role` where role = "Staffing Admin" and parent in(select user_id from `tabEmployee` where user_id != '' and company = (select company from `tabEmployee` where name = %s)) """, employee, as_dict=1)

        for user in user_list:
            if not frappe.db.exists("User Permission",{"user": user.parent,"allow": "Timesheet","apply_to_all_doctypes":1, "for_value": docname}):
                add("Timesheet", docname, user=user.parent, read=1, write=1)
                perm_doc = frappe.get_doc(dict(doctype="User Permission",user=user.parent,allow="Timesheet",for_value=docname,apply_to_all_doctypes=1))
                perm_doc.save(ignore_permissions=True)
    except Exception as e:
        frappe.error_log(e, "Job Order Approval")
        frappe.throw(e)
