from __future__ import unicode_literals
from frappe.core.doctype.user.user import User
from frappe.model.document import Document
from erpnext.hr.doctype.employee.employee import Employee
from erpnext.setup.doctype.company.company import Company
from tag_workflow.utils.doctype_method import validate_username, suggest_username, send_login_mail, raise_no_permission_to, validate_duplicate_user_id, validate_abbr

__version__ = '0.0.1'


User.validate_username = validate_username 
User.suggest_username = suggest_username
User.send_login_mail = send_login_mail
Document.raise_no_permission_to = raise_no_permission_to
Employee.validate_duplicate_user_id = validate_duplicate_user_id
Company.validate_abbr = validate_abbr
