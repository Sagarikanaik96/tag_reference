from . import __version__ as app_version

app_name = "tag_workflow"
app_title = "Tag Workflow"
app_publisher = "SourceFuse"
app_description = "App to cater for custom development"
app_icon = "octicon octicon-file-directory"
app_color = "grey"
app_email = "shadab.sutar@sourcefuse.com"
app_license = "MIT"

# Includes in <head>
# ------------------
fixtures = [{"dt":"Workspace", "filters": [["module", "in", ("CRM")]]}, "Website Settings"]
on_session_creation = [
        "tag_workflow.utils.trigger_session.on_session_creation"
]
# include js, css files in header of desk.html
# app_include_css = "/assets/tag_workflow/css/tag_workflow.css"
# app_include_js = "/assets/tag_workflow/js/tag_workflow.js"


# include js, css files in header of web template
# web_include_css = "/assets/tag_workflow/css/tag_workflow.css"
# web_include_js = "/assets/tag_workflow/js/tag_workflow.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "tag_workflow/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
doctype_js = {
        "User" : "public/js/controllers/user.js",
        "Company": "public/js/controllers/company.js",
        "Item": "public/js/controllers/item.js",
        "Timesheet": "public/js/controllers/timesheet.js",
        "Quotation": "public/js/controllers/quotation.js",
        "Sales Order": "public/js/controllers/sales_order.js"
}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
#	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "tag_workflow.utils.jinja_methods",
# 	"filters": "tag_workflow.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "tag_workflow.install.before_install"
# after_install = "tag_workflow.install.after_install"
after_migrate = ["tag_workflow.utils.organization.setup_data"]
# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "tag_workflow.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
        "*":{
            "validate": "tag_workflow.controllers.base_controller.validate_controller"
        }
}
# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"tag_workflow.tasks.all"
# 	],
# 	"daily": [
# 		"tag_workflow.tasks.daily"
# 	],
# 	"hourly": [
# 		"tag_workflow.tasks.hourly"
# 	],
# 	"weekly": [
# 		"tag_workflow.tasks.weekly"
# 	],
# 	"monthly": [
# 		"tag_workflow.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "tag_workflow.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "tag_workflow.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "tag_workflow.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]


# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"tag_workflow.auth.validate"
# ]

