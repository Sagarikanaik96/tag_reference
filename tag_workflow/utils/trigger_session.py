import frappe
from frappe import _
from frappe.core.doctype.session_default_settings.session_default_settings import set_session_default_values

def on_session_creation(login_manager):
    try:
        if frappe.db.exists("Employee", {"user_id": frappe.session.user}):
            company = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "company") or ""
            default_values = {"company": company}
            set_session_default_values(default_values)
    except Exception as e:
        print(e)
