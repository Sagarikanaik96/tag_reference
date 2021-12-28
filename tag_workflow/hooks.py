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
        "/assets/tag_workflow/js/controllers/sortable.js",
        "/assets/tag-template.min.js"
]

web_include_css = [
        "/assets/tag_workflow/css/web_tag.css"
]

# include js in doctype views
doctype_js = {
        "User" : "public/js/controllers/user.js",
        "Company": "public/js/controllers/company.js",
        "Item": "public/js/controllers/item.js",
        "Timesheet": "public/js/controllers/timesheet.js",
        "Quotation": "public/js/controllers/quotation.js",
        "Sales Order": "public/js/controllers/sales_order.js",
        "Employee": "public/js/controllers/employee.js",
        "Sales Invoice": "public/js/controllers/sales_invoice.js",
        "Contact": "public/js/controllers/contact.js",
        "Lead": "public/js/controllers/lead.js",
        "Contract": "public/js/controllers/contract.js"
}

# doctype list
doctype_list_js = {
        "User": "public/js/doctype_list/user_list.js",
        "Employee": "public/js/doctype_list/employee_list.js"
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
        "Sales Invoice": "tag_workflow.dashboard_data.sales_invoice_dashboard.get_data",
        "Lead": "tag_workflow.dashboard_data.lead_dashboard.get_data"
}
scheduler_events={
        "all":  [
	        "tag_workflow.tag_data.update_job_order_status"
	]
}
