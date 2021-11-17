from . import __version__ as app_version

app_name = "tag_workflow"
app_title = "Tag Workflow"
app_publisher = "SourceFuse"
app_description = "App to cater for custom development"
app_icon = "octicon octicon-file-directory"
app_color = "grey"
app_email = "shadab.sutar@sourcefuse.com"
app_license = "MIT"
app_logo_url = "/assets/tag_workflow/images/TAG-Logo-Emblem.png"
# Includes in <head>
# ------------------
fixtures = ["Workspace", "Website Settings"]
on_session_creation = [
        "tag_workflow.utils.trigger_session.on_session_creation"
]

# include js, css files in header of desk.html
# app_include_css = "/assets/tag_workflow/css/tag_workflow.css"

# include js, css files in header of web template
# web_include_css = "/assets/tag_workflow/css/tag_workflow.css"
# web_include_js = "/assets/tag_workflow/js/tag_workflow.js"
# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "tag_workflow/public/scss/website"

app_include_css = [
    "/assets/tag_workflow/css/tag.css"
]

app_include_js = [
        "/assets/tag_workflow/js/tag.js",
]

# include js in doctype views
doctype_js = {
        "User" : "public/js/controllers/user.js",
        "Company": "public/js/controllers/company.js",
        "Item": "public/js/controllers/item.js",
        "Timesheet": "public/js/controllers/timesheet.js",
        "Quotation": "public/js/controllers/quotation.js",
        "Sales Order": "public/js/controllers/sales_order.js",
        "Employee": "public/js/controllers/employee.js"
}

after_migrate = ["tag_workflow.utils.organization.setup_data"]

# Hook on document methods and events
doc_events = {
        "*":{
            "validate": "tag_workflow.controllers.base_controller.validate_controller"
        }
}

# logo
website_context = {
        "favicon": "/assets/tag_workflow/images/TAG-Logo-Emblem.png",
        "splash_image": "/assets/tag_workflow/images/TAG-Logo.png"
}
