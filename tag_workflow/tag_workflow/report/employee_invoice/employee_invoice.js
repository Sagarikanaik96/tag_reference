// Copyright (c) 2016, SourceFuse and contributors
// For license information, please see license.txt
/* eslint-disable */

function get_first_sunday(){
	if(frappe.datetime.week_start() < frappe.datetime.get_today()){
		return frappe.datetime.week_start()
	}
	else{
		return frappe.datetime.get_today()
	}
}

frappe.query_reports["Employee Invoice"] = {
	"filters": [
		{
			"fieldname":"start_date",
			"label": ("From Date"),
			"fieldtype": "Date",
			"width": "80",
			"reqd": 1,
			"default": get_first_sunday()
		},
		{
			"fieldname":"end_date",
			"label": ("To Date"),
			"fieldtype": "Date",
			"width": "80",
			"reqd": 1,
			"default": frappe.datetime.get_today()
		}
	]
};
