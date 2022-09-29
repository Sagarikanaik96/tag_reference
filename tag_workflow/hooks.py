from . import __version__ as app_version

app_name = "tag_workflow"
app_title = "Tag Workflow"
app_publisher = "SourceFuse"
app_description = "App to cater for custom development"
app_icon = "octicon octicon-file-directory"
app_color = "grey"
app_email = "shadab.sutar@sourcefuse.com"
app_license = "MIT"
app_logo_url = "/assets/tag_workflow/images/TAG-Logo-Emblem.svg"

# global
sales_invoice="Sales Invoice"
map= "public/js/controllers/doc_map.js"
# Includes in <head>
# ------------------
fixtures = ["Workspace", "Website Settings", "Web Page", "Translation", "Workflow", "Workflow State", "Workflow Action Master",
{"dt": "Property Setter",
        "filters": [
	[
		"name","in",
 			[
				"User-document_follow_notifications_section-hidden",
				"User-sb1-hidden",
				"User-email_settings-hidden",
				"User-sb_allow_modules-hidden",
				"User-sb3-hidden",
				"User-gender-depends_on",
				"User-birth_date-depends_on",
				"User-bio-collapsible",
				"User-new_password-mandatory_depends_on",
				"User-email-read_only_depends_on",
				"User-short_bio-collapsible",
				"User-sb2-hidden",
				"User-third_party_authentication-hidden",
				"User-api_access-hidden",
				"User-full_name-hidden",
				"User-language-hidden",
				"User-time_zone-hidden",
				"User-middle_name-hidden",
				"User-username-hidden",
				"User-interest-hidden",
				"User-banner_image-hidden",
				"User-mute_sounds-hidden",
				"User-desk_theme-hidden",
				"User-phone-hidden",
				"User-bio-hidden"
			]
	]
	]}
]

on_login = "tag_workflow.utils.trigger_session.first_login"

boot_session = "tag_workflow.utils.trigger_session.update_boot"

on_session_creation = [
        "tag_workflow.utils.trigger_session.on_session_creation"
]

app_include_css = [
        "/assets/tag_workflow/css/tag.css"
]

app_include_js = [
        "/assets/tag_workflow/js/tag.js",
        "/assets/tag_workflow/js/map.js",
        "/assets/tag_workflow/js/controllers/sortable.js",
        "/assets/tag-template.min.js",
        "/assets/js/file_upload.min.js",
        "/assets/js/tag-min.js",
        "/assets/tag_workflow/js/frappe/form/controls/attach.js",
        "/assets/tag_workflow/js/frappe/form/controls/link.js",
        "/assets/tag_workflow/js/twilio_utils.js",
        "/assets/tag_workflow/js/list.js",
        "/assets/tag_workflow/js/emp_functions.js",
        "/assets/tag_workflow/js/frappe/data_import/index.js",
        "/assets/tag_workflow/js/frappe/data_import/import_preview.js",
        "/assets/tag_workflow/js/frappe/data_import/data_exporter.js"
]

web_include_css = [
        "/assets/tag_workflow/css/web_tag.css"
]

# include js in doctype views
doctype_js = {
        "User" : "public/js/controllers/user.js",
        "Company": ["public/js/controllers/company.js",map],
        "Designation":"public/js/controllers/designation.js",
        "Item": "public/js/controllers/item.js",
        "Timesheet": "public/js/controllers/timesheet.js",
        "Quotation": "public/js/controllers/quotation.js",
        "Sales Order": "public/js/controllers/sales_order.js",
        "Employee": ["public/js/controllers/employee.js",map],
        sales_invoice: "public/js/controllers/sales_invoice.js",
        "Contact": ["public/js/controllers/contact.js",map],
        "Lead": ["public/js/controllers/lead.js",map],
        "Contract": "public/js/controllers/contract.js",
        "Job Site": "public/js/controllers/job_sites.js",
        "Data Import":"public/js/controllers/data_import.js",
        "Notification Log": "public/js/controllers/notification_log.js",
        "Employee Onboarding Template": "public/js/controllers/employee_onboarding_template.js",
        "Employee Onboarding": ["public/js/controllers/employee_onboarding.js", map],
        "Job Offer": "public/js/controllers/job_offer.js"
}

# doctype list
doctype_list_js = {
        "User": "public/js/doctype_list/user_list.js",
        "Designation": "public/js/doctype_list/designation_list.js",
        "Employee": "public/js/doctype_list/employee_list.js",
        "Company": "public/js/doctype_list/company_list.js",
        sales_invoice:"public/js/doctype_list/sales_invoice_list.js",
        "Report": "public/js/doctype_list/report_list.js",
        "Timesheet": "public/js/doctype_list/timesheet_list.js",
        "Contact": "public/js/doctype_list/contact_list.js",
        "Lead": "public/js/doctype_list/lead_list.js",
        "Contract": "public/js/doctype_list/contract_list.js",
        "Role Profile": "public/js/doctype_list/role_profile.js",
        "Item": "public/js/doctype_list/item_list.js",
        "Employee Onboarding Template": "public/js/doctype_list/employee_onboarding_template_list.js"
}

after_migrate = ["tag_workflow.utils.organization.setup_data"]

# Hook on document methods and events
validate = "tag_workflow.controllers.base_controller.validate_controller"
doc_events = {
        "*":{
            "validate": validate
        },
        "Company": {
            "on_trash": validate
        },
        "User": {
            "on_update": validate
        },
        "Designation":{
                "after_insert":'tag_workflow.tag_data.designation_activity_data'
        },
       "Contact":{
                "on_update":'tag_workflow.utils.lead.update_contact'
       },
       "Lead":{
               "after_insert":'tag_workflow.utils.lead.lead_contact'
       },
       "Job Site":{
               "after_insert":'tag_workflow.tag_data.job_site_add'
       },
       "Item":{
               "after_insert":'tag_workflow.tag_data.job_title_add'
       },
       'Assign Employee':{
               "before_save":'tag_workflow.tag_workflow.doctype.assign_employee.assign_employee.validate_employee'
       },
       'Job Order':{
               "before_save":'tag_workflow.tag_workflow.doctype.job_order.job_order.validate_company'
	}
}

# logo
website_context = {
        "favicon": "/assets/tag_workflow/images/TAG-Logo-Emblem.png",
        "splash_image": "/assets/tag_workflow/images/TAG-Logo.png"
}

override_doctype_dashboards = {
        "Item": "tag_workflow.dashboard_data.item_dashboard.get_data",
        "Company": "tag_workflow.dashboard_data.company_dashboard.get_data",
        sales_invoice: "tag_workflow.dashboard_data.sales_invoice_dashboard.get_data",
        "Lead": "tag_workflow.dashboard_data.lead_dashboard.get_data",
        "Customer": "tag_workflow.dashboard_data.customer_dashboard.get_data"
}
scheduler_events={
        "all":  [
                "tag_workflow.tag_data.update_job_order_status"
	],
        "daily": [
	        "tag_workflow.tag_data.lead_follow_up"
	],
        "weekly":[
                "tag_workflow.utils.jazz_integration.schedule_job"
        ]
}

override_whitelisted_methods = {
        "frappe.desk.query_report.run": "tag_workflow.utils.whitelisted.run",
        "frappe.desk.desktop.get_desktop_page": "tag_workflow.utils.whitelisted.get_desktop_page",
        "frappe.desk.reportview.delete_items": "tag_workflow.utils.employee.delete_items",
        "frappe.desk.search.search_link": "tag_workflow.utils.whitelisted.search_link",
        "frappe.core.doctype.data_import.data_import.form_start_import": "tag_workflow.utils.data_import.form_start_import",
        "frappe.desk.form.save.savedocs": "tag_workflow.utils.whitelisted.savedocs",
        "frappe.client.save": "tag_workflow.utils.whitelisted.save",
        "erpnext.accounts.party.get_due_date": "tag_workflow.utils.invoice.get_due_date",
        "frappe.model.workflow.bulk_workflow_approval":"tag_workflow.utils.workflow.bulk_workflow_approval",
        "erpnext.hr.utils.get_onboarding_details": "tag_workflow.utils.whitelisted.get_onboarding_details"
}


override_doctype_class = {
    "Designation":"tag_workflow.dashboard_data.designation.DesignationOverride",
    "Company": "tag_workflow.tag_workflow.doctype.company.company.CustomCompany"
}

