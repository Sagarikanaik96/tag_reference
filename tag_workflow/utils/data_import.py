import os
import frappe
from frappe import _
from frappe.core.doctype.data_import.exporter import Exporter
from frappe.core.doctype.data_import.importer import Importer
from frappe.model.document import Document
from frappe.modules.import_file import import_file_by_path
from frappe.utils.background_jobs import enqueue
from frappe.utils.csvutils import validate_google_sheets_url
from frappe.core.page.background_jobs.background_jobs import get_info
from frappe.utils.scheduler import is_scheduler_inactive

@frappe.whitelist()
def form_start_import(data_import):
    try:
        doc = frappe.get_doc("Data Import", data_import)

        if is_scheduler_inactive() and not frappe.flags.in_test:
            frappe.throw(_("Scheduler is inactive. Cannot import data. sahil is here"), title=_("Scheduler Inactive"))

        enqueued_jobs = [d.get("job_name") for d in get_info()]
        if doc.name not in enqueued_jobs:
            enqueue(start_import, queue="long", timeout=60000, event="data_import", job_name=doc.name, data_import=doc.name, now=frappe.conf.developer_mode or frappe.flags.in_test,)
            return True

        return False
    except Exception as e:
        print(e)
        frappe.log_error(e, "bulk import")


def start_import(data_import):
    """This method runs in background job"""
    data_import = frappe.get_doc("Data Import", data_import)
    try:
        i = Importer(data_import.reference_doctype, data_import=data_import)
        i.import_data()
    except Exception:
        frappe.db.rollback()
        data_import.db_set("status", "Error")
        frappe.log_error(title=data_import.name)
    finally:
        frappe.flags.in_import = False

    frappe.publish_realtime("data_import_refresh", {"data_import": data_import.name})