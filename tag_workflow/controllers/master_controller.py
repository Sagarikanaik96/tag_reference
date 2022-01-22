'''
	Added by Sahil
	Email sahil19893@Gmail.com
'''

import json
import frappe
from frappe.share import add
from frappe import _, msgprint, throw
from tag_workflow.controllers import base_controller
from frappe import enqueue
from tag_workflow.utils.trigger_session import share_company_with_user

GROUP = "All Customer Groups"
TERRITORY = "All Territories"
PERMISSION = "User Permission"
EMP = "Employee"
COM = "Company"
JOB = "Job Order"
USR = "User"
STANDARD = ["Administrator", "Guest"]

class MasterController(base_controller.BaseController):
    def validate_master(self):
        self.update_master_data()

    def update_master_data(self):
        if(self.dt == COM):
            self.check_mandatory_field()

            if not frappe.db.exists("Customer", {"name": self.doc.name}): 
                customer = frappe.get_doc(dict(doctype="Customer", customer_name=self.doc.name, customer_type="Company", territory=TERRITORY, customer_group=GROUP))
                customer.insert(ignore_permissions=True)
        elif(self.dt == "User"):
            if(frappe.session.user not in STANDARD and (not self.doc.tag_user_type or not self.doc.organization_type)):
                frappe.msgprint(_("Please select <b>Organization Type</b> and <b>TAG User Type</b> before saving the User."))
        elif(self.dt == "Item"):
            self.check_activity_type()

    def check_mandatory_field(self):
        if not frappe.db.exists("Territory", {"name": TERRITORY}):
            tre_doc = frappe.get_doc(dict(doctype="Territory", territory_name=TERRITORY, is_group=0))
            tre_doc.save(ignore_permissions=True)

        if not frappe.db.exists("Customer Group", {"name": GROUP}):
            group_doc = frappe.get_doc(dict(doctype="Customer Group", customer_group_name=GROUP, is_group=1))
            group_doc.save(ignore_permissions=True)

    def check_activity_type(self):
        if not frappe.db.exists("Activity Type", {"name": self.doc.name}):
            item = frappe.get_doc(dict(doctype = "Activity Type", activity_type = self.doc.name))
            item.save(ignore_permissions=True)

    def validate_trash(self):
        if(self.dt == "Company"):
            frappe.throw(_("User is not allowed to delete the organisation: <b>{0}</b>").format(self.doc.name))

    def apply_user_permissions(self):
        if(self.dt == "User" and self.doc.enabled):
            check_employee(self.doc.email, self.doc.first_name, self.doc.company, self.doc.last_name, self.doc.gender, self.doc.birth_date, self.doc.date_of_joining, self.doc.organization_type)


#-----------data update--------------#
def update_user_info(company, make_organization_inactive):
    try:
        if(make_organization_inactive == 1):
            user = """ select name, enabled from `tabUser` where company="{0}" """.format(company)
            user_list = frappe.db.sql(user, as_dict=1)
            for u in user_list:
                if(u.enabled == 0 and len(frappe.db.get_list("Employee", {"user_id": u.name}, "name")) == 1):
                    frappe.sessions.clear_sessions(user=u.name, keep_current=False, device=None, force=True)
    except Exception as e:
        frappe.error_log(e, "User disabled")

@frappe.whitelist()
def make_update_comp_perm(docname):
    try:
        doc = frappe.get_doc(COM, docname)
        if doc.organization_type == "Exclusive Hiring":
            user_list = get_user_list(doc.parent_staffing)
            enqueue("tag_workflow.controllers.master_controller.update_exclusive_perm", user_list=user_list, company=doc.name)
        elif doc.organization_type != "Staffing":
            user_list = get_user_list()
            enqueue("tag_workflow.controllers.master_controller.update_job_order_permission", user_list=user_list, company=doc.name)
        update_user_info(doc.name, doc.make_organization_inactive)
    except Exception as e:
        frappe.error_log(e, "Quotation and Job Order Permission")


@frappe.whitelist()
def check_item_group():
    try:
        item_group = "Item Group"
        if not frappe.db.exists(item_group, {"name": "Services"}):
            group = frappe.get_doc(dict(doctype=item_group, item_group_name="Services", is_group=0))
            group.save(ignore_permissions=True)
    except Exception as e:
        frappe.error_log(e, item_group)


#-----------after company insert update-------------#
def get_user_list(company=None):
    if company:
        sql = """ select name from `tabUser` where enabled = 1 and tag_user_type in ("Staffing Admin", "Staffing User") and company = '{0}' """.format(company)
    else:
        sql = """ select name from `tabUser` where enabled = 1 and tag_user_type in ("Staffing Admin", "Staffing User")"""

    return frappe.db.sql(sql, as_dict=1)


def update_job_order_permission(user_list, company):
    try:
        for user in user_list:
            if not frappe.db.exists(PERMISSION,{"user": user['name'],"allow": COM,"applicable_for": JOB,"for_value": company,"apply_to_all_doctypes":0}):
                perm_doc = frappe.get_doc(dict(doctype=PERMISSION, user=user['name'], allow=COM, for_value=company, applicable_for=JOB, apply_to_all_doctypes=0))
                perm_doc.save(ignore_permissions=True)
    except Exception as e:
        frappe.error_log(e, "Quotation and Job Order Permission")

def update_exclusive_perm(user_list, company):
    try:
        for user in user_list:
            if not frappe.db.exists(PERMISSION, {"user": user['name'], "allow":COM, "for_value": company, "apply_to_all_doctypes": 1}):
                add(COM, company, user['name'], write=1, read=1, share=0, everyone=0, notify=0, flags={"ignore_share_permission": 1})
                perm = frappe.get_doc(dict(doctype=PERMISSION, user=user['name'], allow=COM, for_value=company, apply_to_all_doctypes = 1))
                perm.save(ignore_permissions=True)
    except Exception as e:
        frappe.error_log(e, "Exclusive Permission")


# remove message on user creation
def make_employee_permission(user, emp, company):
    try:
        if not frappe.db.exists(PERMISSION,{"user": user,"allow": COM,"apply_to_all_doctypes":1, "for_value": company}):
            perm_doc = frappe.get_doc(dict(doctype=PERMISSION,user=user, allow=COM, for_value=company, apply_to_all_doctypes=1))
            perm_doc.save(ignore_permissions=True)
    except Exception as e:
        frappe.error_log(e, PERMISSION)

# user permission for order and exclusive
def new_user_job_perm(user):
    try:
        user_list = [{"name": user}]
        company = frappe.db.get_list(COM, {"organization_type": "Hiring"}, "name")
        for com in company:
            update_job_order_permission(user_list, com['name'])
    except Exception as e:
        frappe.error_log(e, "new_user_job_perm")

def user_exclusive_perm(user, company, organization_type=None):
    try:
        if not organization_type:
            organization_type = frappe.db.get_value("User", user, "organization_type")

        if(organization_type == "Staffing"):
            new_user_job_perm(user)
            exclusive = frappe.get_list("Company", {"parent_staffing": company}, "name")
            for ex in exclusive:
                update_exclusive_perm([{"name": user}], ex.name)

        sql = """ delete from `tabUser Permission` where user = '{0}' and allow = "Employee" """.format(user)
        frappe.db.sql(sql)
    except Exception as e:
        frappe.error_log(e, "user_exclusive_permission")

def remove_tag_permission(user, emp, company):
    try:
        sql = """ select name from `tabUser Permission` where user = '{0}' and (for_value in ('{1}', '{2}')) """.format(user, emp, company)
        perms = frappe.db.sql(sql, as_dict=1)
        for per in perms:
            frappe.delete_doc(PERMISSION, per.name, force=1)
    except Exception as e:
        frappe.error_log(e, "remove_tag_permission")

@frappe.whitelist()
def check_employee(name, first_name, company, last_name=None, gender=None, date_of_birth=None, date_of_joining=None, organization_type=None):
    try:
        if(name in STANDARD): return

        users = [{"name": name, "company": company}]
        if not frappe.db.exists(EMP, {"user_id": name, "company": company}):
            emp = frappe.get_doc(dict(doctype=EMP, first_name=first_name, last_name=last_name, company=company, status="Active", gender=gender, date_of_birth=date_of_birth, date_of_joining=date_of_joining, user_id=name, create_user_permission=1, email=name))
            emp.save(ignore_permissions=True)
        else:
            emp = frappe.get_doc(EMP, {"user_id": name, "company": company})


        if(organization_type != "TAG"):
            make_employee_permission(name, emp.name, company)
            enqueue("tag_workflow.controllers.master_controller.user_exclusive_perm", user=name, company=company, organization_type=None)
            enqueue("tag_workflow.utils.trigger_session.share_company_with_user", users=users)
        elif(organization_type == "TAG"):
            remove_tag_permission(name, emp.name, company)
    except Exception as e:
        frappe.msgprint(e)
        frappe.db.rollback()

@frappe.whitelist()
def multi_company_setup(user, company):
    user = frappe.get_doc(USR, user)
    company = company.split(",")
    for com in company:
        check_employee(user.name, user.first_name, com, user.last_name, user.gender, user.birth_date, user.date_of_joining, user.organization_type)
