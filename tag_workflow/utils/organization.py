'''
    TAG Master Data
'''

import frappe
from frappe import _
from frappe.config import get_modules_from_all_apps
import json, os
from pathlib import Path
from tag_workflow.utils.trigger_session import share_company_with_user
from tag_workflow.controllers.master_controller import make_update_comp_perm, user_exclusive_perm

#-------setup variables for TAG -------------#
tag_workflow= "Tag Workflow"
Organization = "Organization Type"
Module = "Module Profile"
Role_Profile = "Role Profile"
Sign_Label = "Signature Section"
Job_Label = "Job Order"
Custom_Label = "Custom Field"
WEB_MAN = "Website Manager"
USR, EMP = "User", "Employee"

ALL_ROLES = [role.name for role in frappe.db.get_list("Role") or []]

ADD_ORGANIZATION = ["Company", "Quotation", "Lead"]
ADD_ORGANIZATION_DATA = ["TAG", "Hiring", "Staffing", "Exclusive Hiring"]

ROLES = ["Hiring User", "Hiring Admin", "Staffing User", "Staffing Admin", "Tag Admin", "Tag User", "CRM User", "Staff"]

ROLE_PROFILE = [{ROLES[3]: ["Accounts User", "Report Manager", "Sales User", ROLES[3], WEB_MAN, ROLES[6], "Employee"]}, {ROLES[2]: ["Accounts User", "Sales User", WEB_MAN, ROLES[6], "Employee", ROLES[2]]}, {ROLES[1]: [ROLES[1], "Report Manager", WEB_MAN, ROLES[6], "Employee", "Projects User"]}, {ROLES[0]: [WEB_MAN, ROLES[6], "Employee", ROLES[0], "Projects User"]}, {ROLES[4]: ALL_ROLES}, {ROLES[5]: ALL_ROLES}]

MODULE_PROFILE = [{"Staffing": ["CRM", "Projects", tag_workflow, "Accounts", "Selling"]}, {"Tag Admin": ["Core", "Workflow", "Desk", "CRM", "Projects", "Setup", tag_workflow, "Accounts", "Selling", "HR"]}, {"Hiring": ["CRM", tag_workflow, "Selling"]}]

SPACE_PROFILE = ["CRM", "Users", tag_workflow, "Settings", "Home", "My Activities"]

#------setup data for TAG -------------#
def setup_data():
    try:
        update_organization()
        update_organization_data()
        update_roles()
        update_role_profile()
        update_module_profile()
        update_permissions()
        set_workspace()
        setup_company_permission()
        check_if_user_exists()
        share_company_with_user()
        frappe.db.commit()
    except Exception as e:
        print(e)
        frappe.log_error(e, "Master")
        #frappe.db.rollback()

#--------org_field_update----------#
def update_organization():
    try:
        print("*------updating organization field----------*\n")
        for docs in ADD_ORGANIZATION:
            if(docs in ["Company"]):
                if not frappe.db.exists(Custom_Label, {"dt": docs, "label": Organization}):
                    custom_doc = frappe.get_doc(dict(doctype=Custom_Label, dt=docs, label=Organization, fieldtype="Link", options=Organization,reqd=1))
                    custom_doc.save()

            elif(docs in ["Quotation"] and not frappe.db.exists(Custom_Label, {"dt": docs, "label": Job_Label})):
                custom_doc = frappe.get_doc(dict(doctype=Custom_Label, dt=docs, label=Job_Label, fieldtype="Link", options=Job_Label,reqd=1))
                custom_doc.save()

            elif(docs in ["Lead"] and not frappe.db.exists(Custom_Label, {"dt": docs, "label": Sign_Label})):
                custom_doc = frappe.get_doc(dict(doctype=Custom_Label, dt=docs, label=Sign_Label, fieldtype="Section Break", insert_after="title"))
                custom_doc.save()

                if not frappe.db.exists(Custom_Label, {"dt": docs, "label": "Signature"}):
                    custom_doc = frappe.get_doc(dict(doctype=Custom_Label, dt=docs, label="Signature", fieldtype="Signature",reqd=0, insert_after=Sign_Label, mandatory_depends_on="eval: doc.status=='Close'"))
                    custom_doc.save()
    except Exception as e:
        print(e)
        frappe.log_error(e, "update_organization")

#--------org_update----------#
def update_organization_data():
    try:
        print("*------updating organization data-----------*\n")
        sql = """ delete from `tabOrganization Type` """
        frappe.db.sql(sql)
        for data in ADD_ORGANIZATION_DATA:
            org_doc = frappe.get_doc(dict(doctype = Organization, organization = data))
            org_doc.save()
    except Exception as e:
        print(e)
        frappe.log_error(e, "update_organization_data")

#--------role_update----------#
def update_roles():
    try:
        print("*------updating roles-----------------------*\n")
        for role in ROLES:
            if not frappe.db.exists("Role", {"name": role}):
                role_doc = frappe.get_doc(dict(doctype = "Role", role_name = role, desk_access = 1, search_bar = 1, notifications = 1, list_sidebar = 1, bulk_action = 1, view_switcher = 1, form_sidebar = 1, timeline = 1, dashboard = 1))
                role_doc.save()
    except Exception as e:
        print(e)
        frappe.log_error(e, "update_roles")

#--------role_profile_update----------#
def update_role_profile():
    try:
        print("*------updating role profile----------------*\n")
        profiles = {k for role in ROLE_PROFILE for k in role.keys()}
        for profile in profiles:
            profile_data = [role[profile] for role in ROLE_PROFILE if profile in role][0]

            if not frappe.db.exists(Role_Profile, {"name": profile}):
                profile_doc = frappe.new_doc(Role_Profile)
                profile_doc.role_profile = profile 
                for data in profile_data:
                    profile_doc.append("roles", {"role": data})
            else:
                profile_doc = frappe.get_doc(Role_Profile, {"name": profile})
                profile_doc.roles = []
                for data in profile_data:
                    profile_doc.append("roles", {"role": data})
            profile_doc.save()
    except Exception as e:
        print(e)
        frappe.log_error(frappe.get_traceback(), "update_role_profile")

#--------module_update----------#
def update_module_profile():
    try:
        print("*------updating module profile--------------*\n")
        all_modules = [m.get("module_name") for m in get_modules_from_all_apps()]
        modules = {k for module in MODULE_PROFILE for k in module.keys()}
        
        for mods in modules:
            module_data = [profile[mods] for profile in MODULE_PROFILE if mods in profile][0]

            if not frappe.db.exists(Module, {"name": mods}):
                module_doc = frappe.new_doc(Module)
                module_doc.module_profile_name = mods
                module_doc = module_data_update(all_modules, module_data, module_doc)
            else:
                module_doc = frappe.get_doc(Module, {"name": mods})
                module_doc.block_modules = []
                module_doc = module_data_update(all_modules, module_data, module_doc)
            module_doc.save()
    except Exception as e:
        print(e)
        frappe.log_error(e, "update_module_profile")

def module_data_update(all_modules, module_data, module_doc):
    try:
        for data in all_modules:
            if(data not in module_data):
                module_doc.append("block_modules", {"module": data})
        return module_doc
    except Exception as e:
        print(e)
        frappe.log_error(e, "module_data_update")

#--------permissions_update----------#
def update_permissions():
    try:
        print("*------updating permissions-----------------*\n")
        sql = """ delete from `tabCustom DocPerm` """
        frappe.db.sql(sql)
        FILE_PATH = str(Path(__file__).resolve().parent) + "/role_permission.json"
        refactor_permission_data(FILE_PATH)

        with open(FILE_PATH, 'r') as data_file:
            permissions = json.load(data_file)

        for perm in permissions:
            permission_doc = frappe.get_doc(dict(perm))
            permission_doc.save()
    except Exception as e:
        print(e)
        frappe.log_error(e, "update_permissions")


def refactor_permission_data(file_path):
    try:
        with open(file_path, 'r') as data_file:
            data = json.load(data_file)

        for element in data:
            element.pop('name', '')
            element.pop('modified', '')

        with open(file_path, 'w') as data_file:
            data = json.dump(data, data_file)
    except Exception as e:
        print(e)
        frappe.log_error(e, "refactor_permission_data")


# workspace update
def set_workspace():
    try:
        print("*------updating workspace-------------------*\n")
        workspace = frappe.get_list("Workspace", ['name'])
        for space in workspace:
            if(space.name not in SPACE_PROFILE):
                frappe.delete_doc("Workspace", space.name, force=1)
    except Exception as e:
        frappe.log_error(e, "set_workspace")

# permission for various purpose
def setup_company_permission():
    try:
        print("*------company permission-------------------*\n")
        companies = frappe.get_list("Company", ["name"])
        for com in companies:
            make_update_comp_perm(com.name)
    except Exception as e:
        frappe.log_error(e, "setup_company_permission")
        print(e)

# check user employee data
def check_if_user_exists():
    try:
        print("*------user update--------------------------*\n")
        user_list = frappe.get_list(USR, ["name", "organization_type", "company"])
        for user in user_list:
            if(frappe.db.exists(EMP, {"user_id": user.name})):
                company, date_of_joining = frappe.db.get_value(EMP, {"user_id": user.name}, ["company", "date_of_joining"])
                sql = """ UPDATE `tabUser` SET company = '{0}', date_of_joining = '{1}' where name = '{2}' """.format(company, date_of_joining, user.name)
                frappe.db.sql(sql)

            if(user.company):
                user_exclusive_perm(user.name, user.company, user.organization_type)
    except Exception as e:
        frappe.log_error(e, "user update")
        print(e)
