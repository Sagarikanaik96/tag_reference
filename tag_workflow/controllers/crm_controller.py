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
        if self.doc.status == "Close" and not self.doc.sign:
            frappe.throw("Please add Signature before closing Lead")



#-----------org type details--------#
def get_org_types(staffing, organization_type=None):
    try:
        org_type, user_type, tag_user_type, staffing = EXC, "Hiring", "Hiring Admin", staffing

        if(organization_type == "Staffing"):
            org_type, user_type, tag_user_type, staffing = "Staffing", "Staffing", "Staffing Admin", ""
        elif(organization_type == "Hiring"):
            org_type, user_type, tag_user_type, staffing = "Hiring", "Hiring", "Hiring Admin", ""
        return org_type, user_type, tag_user_type, staffing
    except Exception as e:
        print(e)
        return org_type, user_type, tag_user_type, staffing


@frappe.whitelist()
def onboard_org(lead):
    try:
        lead_value=frappe.get_doc('Lead',lead)
        exclusive=lead_value.company_name
        staffing=lead_value.owner_company
        email=lead_value.email_id
        person_name=lead_value.lead_name
        phone=lead_value.phone_no
        organization_type=lead_value.organization_type
        lead_value.status='Contract Signing'
        lead_value.save(ignore_permissions=True)

        is_company, is_user = 1, 1
        company_doc, user = "", ""

        org_type, user_type, tag_user_type, staffing = get_org_types(staffing, organization_type)

        if frappe.db.exists("User", email):
            frappe.msgprint(_("User already exists with given email(<b>{0}</b>). Email must be unique for onboarding.").format(email))
            return 'user not created'

        if not frappe.db.exists("Company", exclusive):
            exclusive = make_company(lead, exclusive, staffing, org_type)
            is_company = 0

        if not frappe.db.exists("User", email):
            user = make_user(exclusive, staffing, email, person_name, org_type, user_type, tag_user_type, phone)
            is_user = 0

        enqueue("tag_workflow.controllers.master_controller.make_update_comp_perm", docname=exclusive)
        return is_company, is_user, company_doc, user
    except Exception as e:
        frappe.db.rollback()
        print(e)
        frappe.throw(e)


# add orgs
def make_company(lead, exclusive, staffing, org_type):
    try:
        contract=''
        if(frappe.db.exists("Contract", {"lead": lead})):
            contract = frappe.get_doc("Contract", {"lead": lead})

        company = frappe.get_doc(dict(doctype="Company", organization_type=org_type, parent_staffing=staffing, company_name=exclusive, default_currency="USD", country="United States", create_chart_of_accounts_based_on="Standard Template", chart_of_accounts= "Standard with Numbers"))
        if(contract):

            for c in contract.job_titles:
                company.append("job_titles", {"job_titles": c.job_titles, "wages": c.wages,"description":c.description})

            for c in contract._industry_types:
                company.append("industry_type",{"industry_type":c.industry_type})
        company.save(ignore_permissions=True)
        return company.name
    except Exception as e:
        frappe.throw(e)


def make_user(exclusive, staffing, email, person_name, org_type, user_type, tag_user_type,phone):
    try:
        user = frappe.get_doc(dict(doctype="User", organization_type=org_type, tag_user_type=tag_user_type, company=exclusive, email=email, first_name=person_name, module_profile=user_type, role_profile_name=tag_user_type, date_of_joining=frappe.utils.nowdate(), mobile_no=phone))
        user.save(ignore_permissions=True)
        return user.name
    except Exception as e:
        frappe.throw(e)
