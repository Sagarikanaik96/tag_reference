'''
    CRM Controller For Lead
'''

import frappe
from frappe import _, msgprint, throw
from tag_workflow.controllers import base_controller

class CRMController(base_controller.BaseController):
    def validate_crm(self):
        self.check_lead_closing()

    def check_lead_closing(self):
        if self.doc.status == "Close" and not self.doc.signature:
            frappe.throw("Please add Signature before closing Lead")




@frappe.whitelist()
def onboard_org(exclusive, staffing, email, user, person_name):
    try:
        is_company, is_user = 1, 1
        company_doc, user_doc = "", ""
        if not frappe.db.exists("Company", exclusive):
            company_doc = make_company(exclusive, staffing)
            is_company = 0

        if not frappe.db.exists("User", email):
            user_doc = make_user(exclusive, staffing, email, person_name)
            is_user = 0

        return is_company, is_user, company_doc, user_doc
    except Exception as e:
        frappe.db.rollback()
        frappe.throw(e)


# add orgs
def make_company(exclusive, staffing):
    try:
        from tag_workflow.controllers.master_controller import make_update_comp_perm
        company = frappe.get_doc(dict(doctype="Company", organization_type="Exclusive Hiring", parent_staffing=staffing, company_name=exclusive, default_currency="USD", country="United States", create_chart_of_accounts_based_on="Standard Template", chart_of_accounts= "Standard with Numbers"))
        company.save(ignore_permissions=True)
        make_update_comp_perm(company.name)
        return company.name
    except Exception as e:
        frappe.throw(e)


def make_user(exclusive, staffing, email, person_name):
    try:
        from tag_workflow.controllers.master_controller import check_employee
        user = frappe.get_doc(dict(doctype="User", organization_type="Exclusive Hiring", tag_user_type="Hiring Admin", company=exclusive, email=email, first_name=person_name))
        user.save(ignore_permissions=True)
        check_employee(user.name, person_name, exclusive, last_name=None, gender=None, date_of_birth=None, date_of_joining=None)
        return user.name
    except Exception as e:
        frappe.throw(e)
