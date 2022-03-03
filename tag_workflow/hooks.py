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
# Includes in <head>
# ------------------
fixtures = ["Workspace", "Website Settings", "Web Page", "Translation", "Workflow", "Workflow State", "Workflow Action Master"]

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
        "/assets/js/tag-min.js"
]

web_include_css = [
        "/assets/tag_workflow/css/web_tag.css"
]

# include js in doctype views
doctype_js = {
        "User" : "public/js/controllers/user.js",
        "Company": "public/js/controllers/company.js",
        "Designation":"public/js/controllers/designation.js",
        "Item": "public/js/controllers/item.js",
        "Timesheet": "public/js/controllers/timesheet.js",
        "Quotation": "public/js/controllers/quotation.js",
        "Sales Order": "public/js/controllers/sales_order.js",
        "Employee": "public/js/controllers/employee.js",
        sales_invoice: "public/js/controllers/sales_invoice.js",
        "Contact": "public/js/controllers/contact.js",
        "Lead": "public/js/controllers/lead.js",
        "Contract": "public/js/controllers/contract.js",
        "Job Site": "public/js/controllers/job_sites.js"
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
        "Role Profile": "public/js/doctype_list/role_profile.js"
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
	]
}

override_whitelisted_methods = {
        "frappe.desk.query_report.run": "tag_workflow.utils.whitelisted.run",
        "frappe.desk.desktop.get_desktop_page": "tag_workflow.utils.whitelisted.get_desktop_page"
}

override_doctype_class = {
    "Designation":"tag_workflow.dashboard_data.designation.DesignationOverride"
} 
