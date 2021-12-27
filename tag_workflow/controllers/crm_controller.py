'''
    CRM Controller For Lead
'''

import frappe
from frappe import enqueue
from frappe import _, msgprint, throw
from tag_workflow.controllers import base_controller
from tag_workflow.controllers.master_controller import check_employee

# global #
EXC = "Exclusive Hiring"

class CRMController(base_controller.BaseController):
    def validate_crm(self):
        self.check_lead_closing()

    def check_lead_closing(self):
        if self.doc.status == "Close" and not self.doc.signature:
            frappe.throw("Please add Signature before closing Lead")




@frappe.whitelist()
def onboard_org(exclusive, staffing, email, person_name):
    try:
        is_company, is_user = 1, 1
        company_doc, user = "", ""

        if frappe.db.exists("User", email):
            frappe.msgprint(_("User already exists with given email(<b>{0}</b>). Email must be unique for onboarding.").format(email))
            return is_company, is_user, company_doc, user

        if not frappe.db.exists("Company", exclusive):
            exclusive = make_company(exclusive, staffing)
            is_company = 0

        if not frappe.db.exists("User", email):
            user = make_user(exclusive, staffing, email, person_name)
            is_user = 0

        enqueue("tag_workflow.controllers.master_controller.make_update_comp_perm", docname=exclusive)
        return is_company, is_user, company_doc, user
    except Exception as e:
        frappe.db.rollback()
        frappe.throw(e)


# add orgs
def make_company(exclusive, staffing):
    try:
        company = frappe.get_doc(dict(doctype="Company", organization_type=EXC, parent_staffing=staffing, company_name=exclusive, default_currency="USD", country="United States", create_chart_of_accounts_based_on="Standard Template", chart_of_accounts= "Standard with Numbers"))
        company.save(ignore_permissions=True)
        return company.name
    except Exception as e:
        frappe.throw(e)


def make_user(exclusive, staffing, email, person_name):
    try:
        user = frappe.get_doc(dict(doctype="User",organization_type=EXC,tag_user_type="Hiring Admin",company=exclusive,email=email,first_name=person_name,module_profile="Hiring",role_profile_name="Hiring Admin", date_of_joining=frappe.utils.nowdate()))
        user.save(ignore_permissions=True)
        check_employee(user.name, person_name, exclusive, last_name=None, gender=None, date_of_birth=None, date_of_joining=user.date_of_joining, organization_type=EXC)
        return user.name
    except Exception as e:
        frappe.throw(e)
