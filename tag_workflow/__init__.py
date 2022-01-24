from __future__ import unicode_literals
import boto3
import frappe
from frappe.core.doctype.user.user import User
from frappe.model.document import Document
from frappe.core.doctype.navbar_settings.navbar_settings import NavbarSettings
from erpnext.hr.doctype.employee.employee import Employee
from erpnext.setup.doctype.company.company import Company
from erpnext.crm.doctype.lead.lead import Lead
from erpnext.projects.doctype.timesheet.timesheet import Timesheet
from tag_workflow.utils.doctype_method import validate_username, suggest_username, send_login_mail, raise_no_permission_to, validate_duplicate_user_id, validate_abbr, validate_standard_navbar_items, create_contact, update_cost

__version__ = '0.0.1'


User.validate_username = validate_username 
User.suggest_username = suggest_username
User.send_login_mail = send_login_mail
Document.raise_no_permission_to = raise_no_permission_to
Employee.validate_duplicate_user_id = validate_duplicate_user_id
Company.validate_abbr = validate_abbr
NavbarSettings.validate_standard_navbar_items =validate_standard_navbar_items
Lead.create_contact = create_contact
Timesheet.update_cost = update_cost

def get_key(key):
    try:
        if(frappe.cache().get_value("aws")):
            return frappe.cache().get_value("aws")['tag_keys'][key]
        else:
            client = boto3.client('ssm')
            response = client.get_parameter(Name='env_details')
            frappe.cache().set_value("aws", response)
            return frappe.cache().get_value("aws")['tag_keys'][key]
    except Exception as e:
        frappe.error_log(e, "redis")
        return ""
