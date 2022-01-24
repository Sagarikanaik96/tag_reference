# Copyright (c) 2013, SourceFuse and contributors
# For license information, please see license.txt


import frappe
from frappe import _

def execute(filters=None):
    columns, data = [], []
    columns = get_columns()
    data = get_data(filters)
    return columns, data

def get_columns():
    columns = [
            {
                "label": _("Employee Code"),
                "fieldname": "employee",
                "fieldtype": "Link",
                "options": "EMployee",
                "width": 150
            },
            {
                "label": _("Employee Name"),
                "fieldname": "employee_name",
                "width": 150
            },
            {
                "label": _("Job Title"),
                "fieldname": "job_title",
                "fieldtype": "Data",
                "width": 150
            },
            {
                "label": _("Start Date"),
                "fieldname": "start_date",
                "fieldtype": "Date",
                "width": 150
            },
            {
                "label": _("End Date"),
                "fieldname": "end_date",
                "fieldtype": "Date",
                "width": 150
            },
            {
                "label": _("Hours Worked"),
                "fieldname": "hours",
                "fieldtype": "Float",
                "width": 150
            },
            {
                "label": _("Total Payment"),
                "fieldname": "total_payment",
                "fieldtype": "Currency",
                "width": 150
            }
        ]
    return columns

def get_condition(filters):
    try:
        condition = ""

        if(filters.get("employee")):
            condition += " and employee = '{0}'".format(filters.get("employee"))

        if(filters.get("company")):
            condition += " and company = '{0}'".format(filters.get("company"))

        return condition
    except Exception as e:
        frappe.msgprint(e)


def get_data(filters):
    try:
        condition = get_condition(filters)
        sql = """ select name, job_order_detail, employee, employee_name, total_billable_hours, total_billable_amount, company from `tabTimesheet` where docstatus = 1 {0} """.format(condition)
        data = frappe.db.sql(sql, as_dict=True)

        row = []
        for d in data:
            if(d.job_order_detail):
                start_date, end_date, job_title = frappe.db.get_value("Job Order", {"name": d.job_order_detail}, ["from_date", "to_date", "select_job"])
                row.append({"employee": d.employee, "employee_name": d.employee_name, "job_title": job_title, "start_date": start_date, "end_date": end_date, "hours": d.total_billable_hours, "total_payment": d.total_billable_amount})

        return row
    except Exception as e:
        frappe.msgprint(e)


