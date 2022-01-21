import frappe
from frappe import _, msgprint
from frappe.share import add


#------------email and system notification----------#
def sendmail(emails, message, subject, doctype, docname):
    try:
        frappe.sendmail(emails, subject=subject, delayed=False, reference_doctype=doctype, reference_name=docname, message=message)
        frappe.msgprint(_("Notification has been sent successfully"))
    except Exception as e:
        frappe.error_log(e, "Frappe Mail")
        frappe.throw(e)


def make_system_notification(users, message, doctype, docname, subject):
    try:
        for user in users:
            notification = frappe.get_doc(dict(doctype="Notification Log", document_type=doctype, document_name=docname, subject=message, for_user=user, from_user=frappe.session.user))
            notification.save(ignore_permissions=True)
    except Exception as e:
        frappe.log_error(e, "System Notification")
        frappe.throw(e)

def share_doc(doctype, docname, user):
    try:
        add(doctype, docname, user=user, read=1, write=1, submit=1, notify=0, flags={"ignore_share_permission": 1})
    except Exception as e:
        print(e)
