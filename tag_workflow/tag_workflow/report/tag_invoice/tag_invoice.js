// Copyright (c) 2016, SourceFuse and contributors
// For license information, please see license.txt
/* eslint-disable */
function get_staffing_company_list(){
	let company = '\n';
	frappe.call({
		"method": "tag_workflow.utils.whitelisted.get_staffing_company_list",
		"args": {"company_type": "Hiring"},
		"async": 0,
		"callback": function(r){
			company += r.message;
		}
	});
	return company
}
frappe.query_reports["Tag Invoice"] = {
	"filters": [
		{
				"fieldname": "company",
				"label": __("Staffing Company"),
				"fieldtype": "Select",
				"options": get_staffing_company_list(),
		},
		{
			"fieldname": 'status',
            "label": __('Status'),
            "fieldtype": 'Select',
            "options": '\nCompleted\nOngoing\nUpcoming',
			"width":100,
			"reqd":0,
		},
		{
			"fieldname":"month",
			"label":"Month",
			"fieldtype": "Select",
			"options":'January\nFebruary\nMarch\nApril\nMay\nJune\nJuly\nAugust\nSeptember\nOctober\nNovember\nDecember',
			"width":"80",
			"default": "January"
			
		},
		{
			"fieldname":"from_fiscal_year",
			"label": __("Start Year"),
			"fieldtype": "Select",
			"options": "\n2021\n2022\n2023\n2024",
			"reqd": 1,
			"default": '2022'

		},
	]
};

if (frappe.user_roles.includes('Tag Admin')){
	setTimeout(hide_field,100)
}

function hide_field(){
	frappe.query_report.get_filter("company").toggle(false)

}