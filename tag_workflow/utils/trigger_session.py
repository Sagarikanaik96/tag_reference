import frappe, tag_workflow
from frappe import _, msgprint, throw
from frappe.share import add
from frappe.utils import cint, cstr, flt
from frappe.core.doctype.session_default_settings.session_default_settings import set_session_default_values

USR = "User"

# session update
def on_session_creation():
    try:
        company = frappe.db.get_value(USR, {"name": frappe.session.user}, "company") or ""
        default_values = {"company": company}
        set_session_default_values(default_values)
    except Exception as e:
        print(e)

# boot update
def update_boot(boot):
    try:
        data = frappe._dict({
            "tag_user_info": get_user_info()
        })
        boot.update({"tag":data})
    except Exception as e:
        print(e)
        frappe.log_error(frappe.get_traceback(), "boot error")


def get_user_info():
    try:
        user = frappe.session.user
        user_doc = frappe.get_doc(USR, user)
        api_key = frappe.get_site_config().tag_gmap_key
        data = {"user_type": user_doc.tag_user_type, "company": user_doc.company, "company_type": user_doc.organization_type, "api_key": api_key, "sid": frappe.session.sid}
        frappe.cache().set_value("sessions", {user: frappe.session.sid})
        return data
    except Exception as e:
        print(e)
        

# check company share
def add_company_share_permission(users):
    try:
        for usr in users:
            if not frappe.db.exists("DocShare", {"share_doctype": "Company", "user":usr['name'], "share_name":usr['company'], "read":1, "write":1, "share": 1}):
                add("Company", usr['company'], user=usr['name'], read=1, write=1, share=1, flags={"ignore_share_permission": 1})
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "doc share error")
        print(e)

def share_company_with_user(users=None):
    try:
        if not users:
            sql = """ select name, company from `tabUser` where enabled = 1 and company != '' """
            users = frappe.db.sql(sql, as_dict=1)
        add_company_share_permission(users)
    except Exception as e:
        frappe.log_error(e, "sharing company")
        print(e)
