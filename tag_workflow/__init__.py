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
import requests, json

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
            try:
                IP_1, IP_2, IP_3, IP_4 = "169.", "254.", "169.", "254"
                reg = "/latest/meta-data/placement/region"
                HTTP = "http"
                URL = HTTP+"://"+IP_1+IP_2+IP_3+IP_4+reg
                print(URL)
                region = requests.get(URL)
                client = boto3.client('ssm', region.text)
                response = client.get_parameter(Name='env_details')
                server_details = json.loads(response['Parameter']['Value'])
                frappe.cache().set_value("aws", server_details)
                return server_details['tag_keys'][key]
            except Exception as e:
                print(e)
                return "Error"
    except Exception as e:
        print(e)
        return "Error"
