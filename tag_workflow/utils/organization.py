'''
    TAG MAster Data
'''

import frappe
from frappe import _
from frappe.config import get_modules_from_all_apps
import json, os
from pathlib import Path

ALL_ROLES = [role.name for role in frappe.db.get_list("Role") or []]

ADD_ORGANIZATION = ["Company", "User", "Quotation", "Lead"]
ADD_ORGANIZATION_DATA = ["TAG", "Hiring", "Staffing", "Exclusive Hiring"]

ROLES = ["Hiring User", "Hiring Admin", "Staffing User", "Staffing Admin", "Tag Admin", "CRM User", "Staff"]
ROLE_PROFILE = [{"Staffing Admin": ["Accounts User", "Report Manager", "Sales User", "Staffing Admin", "Website Manager", "CRM User", "Employee"]}, {"Staffing User": ["Accounts User", "Sales User", "Website Manager", "CRM User", "Employee", "Staffing User"]}, {"Hiring Admin": ["Hiring Admin", "Report Manager", "Website Manager", "CRM User", "Employee", "Projects User"]}, {"Hiring User": ["Website Manager", "CRM User", "Employee", "Hiring User", "Projects User"]}, {"Tag Admin": ALL_ROLES}]

MODULE_PROFILE = [{"Staffing": ["CRM", "Projects", "Tag Workflow", "Accounts", "Selling"]}, {"Tag Admin": ["Core", "Workflow", "Desk", "CRM", "Projects", "Setup", "Tag Workflow", "Accounts", "Selling", "HR"]}, {"Hiring": ["CRM", "Tag Workflow", "Selling"]}]

SPACE_PROFILE = ["CRM", "HR", "Projects", "Users", "Tag Workflow", "Integrations", "ERPNext Integrations Settings", "Settings"]
#-------setup data for TAG -------------#
def setup_data():
    try:
        update_organization()
        update_organization_data()
        update_roles()
        update_role_profile()
        update_module_profile()
        update_permissions()
        set_workspace()
        frappe.db.commit()
    except Exception as e:
        print(e)
        frappe.log_error(e, "Master")
        #frappe.db.rollback()

def update_organization():
    try:
        print("*------updating organization field----------*\n")
        for docs in ADD_ORGANIZATION:
            if(docs in ["Company", "User"]):
                if not frappe.db.exists("Custom Field", {"dt": docs, "label": "Organization Type"}):
                    custom_doc = frappe.get_doc(dict(doctype="Custom Field", dt=docs, label="Organization Type", fieldtype="Link", options="Organization Type",reqd=1))
                    custom_doc.save()

                if(docs == "User"):
                    if not frappe.db.exists("Custom Field", {"dt": docs, "label": "TAG User Type"}):
                        custom_doc = frappe.get_doc(dict(doctype="Custom Field", dt = docs, label = "TAG User Type", fieldtype = "Select", options = "\nHiring Admin\nHiring User\nStaffing Admin\nStaffing User\nTag Admin\nTag User", mandatory_depends_on="eval: doc.organization_type", depends_on = "eval: doc.organization_type"))
                        custom_doc.save()
            elif(docs in ["Quotation"]):
                if not frappe.db.exists("Custom Field", {"dt": docs, "label": "Job Order"}):
                    custom_doc = frappe.get_doc(dict(doctype="Custom Field", dt=docs, label="Job Order", fieldtype="Link", options="Job Order",reqd=1))
                    custom_doc.save()
            elif(docs in ["Lead"]):
                if not frappe.db.exists("Custom Field", {"dt": docs, "label": "Signature Section"}):
                    custom_doc = frappe.get_doc(dict(doctype="Custom Field", dt=docs, label="Signature Section", fieldtype="Section Break", insert_after="title"))
                    custom_doc.save()

                if not frappe.db.exists("Custom Field", {"dt": docs, "label": "Signature"}):
                    custom_doc = frappe.get_doc(dict(doctype="Custom Field", dt=docs, label="Signature", fieldtype="Signature",reqd=0, insert_after="Signature Section", mandatory_depends_on="eval: doc.status=='Close'"))
                    custom_doc.save()
    except Exception as e:
        print(e)
        frappe.log_error(e, "update_organization")

def update_organization_data():
    try:
        print("*------updating organization data-----------*\n")
        frappe.db.sql(""" delete from `tabOrganization Type` """)
        for data in ADD_ORGANIZATION_DATA:
            org_doc = frappe.get_doc(dict(doctype = "Organization Type", organization = data))
            org_doc.save()
    except Exception as e:
        print(e)
        frappe.log_error(e, "update_organization_data")


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

def update_role_profile():
    try:
        print("*------updating role profile----------------*\n")
        profiles = {k for role in ROLE_PROFILE for k in role.keys()}
        for profile in profiles:
            profile_data = [role[profile] for role in ROLE_PROFILE if profile in role][0]

            if not frappe.db.exists("Role Profile", {"name": profile}):
                profile_doc = frappe.new_doc("Role Profile")
                profile_doc.role_profile = profile 
                for data in profile_data:
                    profile_doc.append("roles", {"role": data})
            else:
                profile_doc = frappe.get_doc("Role Profile", {"name": profile})
                profile_doc.roles = []
                for data in profile_data:
                    profile_doc.append("roles", {"role": data})
            profile_doc.save()
    except Exception as e:
        print(e)
        frappe.log_error(e, "update_role_profile")

def update_module_profile():
    try:
        print("*------updating module profile--------------*\n")
        all_modules = [m.get("module_name") for m in get_modules_from_all_apps()]
        modules = {k for module in MODULE_PROFILE for k in module.keys()}
        
        for mods in modules:
            module_data = [profile[mods] for profile in MODULE_PROFILE if mods in profile][0]

            if not frappe.db.exists("Module Profile", {"name": mods}):
                module_doc = frappe.new_doc("Module Profile")
                module_doc.module_profile_name = mods
                for data in all_modules:
                    if(data not in module_data):
                        module_doc.append("block_modules", {"module": data})
            else:
                module_doc = frappe.get_doc("Module Profile", {"name": mods})
                module_doc.block_modules = []
                for data in all_modules:
                    if(data not in module_data):
                        module_doc.append("block_modules", {"module": data})
            module_doc.save()
    except Exception as e:
        print(e)
        frappe.log_error(e, "update_module_profile")


def update_permissions():
    try:
        print("*------updating permissions-----------------*\n")
        frappe.db.sql(""" delete from `tabCustom DocPerm` """)
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


def refactor_permission_data(FILE):
    try:
        with open(FILE, 'r') as data_file:
            data = json.load(data_file)

        for element in data:
            element.pop('name', '')
            element.pop('modified', '')

        with open(FILE, 'w') as data_file:
            data = json.dump(data, data_file)
    except Exception as e:
        print(e)
        frappe.log_error(e, "refactor_permission_data")


# workspace update
def set_workspace():
    try:
        print("*------updating workspace-----------------*\n")
        workspace = frappe.get_list("Workspace", ['name'])
        for space in workspace:
            if(space.name not in SPACE_PROFILE):
                frappe.delete_doc("Workspace", space.name)
    except Exception as e:
        print(e)
