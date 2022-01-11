// Copyright (c) 2016, SourceFuse and contributors
// For license information, please see license.txt
/* eslint-disable */

function get_company_list(){
	let company = '\n';
	frappe.call({
		"method": "tag_workflow.utils.whitelisted.get_company_list",
		"args": {"company_type": "Hiring"},
		"async": 0,
		"callback": function(r){
			company += r.message;
		}
	});
	return company
}

frappe.query_reports["Hourly Report"] = {
	"filters": [
		{
			"fieldname": "employee",
			"label": __("Employee Code"),
			"fieldtype": "Link",
			"options": "Employee"
		},
		{
			"fieldname": "company",
			"label": __("Company"),
			"fieldtype": "Select",
			"options": get_company_list(),
		},
	]
};
