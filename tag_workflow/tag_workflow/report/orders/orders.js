// Copyright (c) 2016, SourceFuse and contributors
// For license information, please see license.txt
/* eslint-disable */
frappe.query_reports["Orders"] = {
	"filters": [
		{
			fieldname: 'status',
            label: __('Status'),
            fieldtype: 'Select',
            options: '\nCompleted\nOngoing\nUpcoming',
			width:100,
			reqd:0
		}

	]
};

function view_joborder(name){
	frappe.set_route("Form", "Job Order", name)
}

async function repeat_joborder(name){
	await frappe.db.get_value("Job Order", name, "*", function(r){
		frappe.route_options = {
			"address": r["address"],
			"age_reqiured": r["age_required"],
			"agree_to_contract": r["agree_to_contract"],
			"amended_from": r["amended_from"],
			"background_check": r["background_check"],
			"bid": r["bid"],
			"category": r["category"],
			"claim": r["claim"],
			"company": r["company"],
			"company_type": r["company_type"],
			"contract_add_on": r["contract_add_on"],
			"description": r["description"],
			"dispute_comment": r["dispute_comment"],
			"docstatus": r["docstatus"],
			"driving_record": r["driving_record"],
			"drug_screen": r["drug_screen"],
			"e_signature_full_name": r["e_signature_full_name"],
			"email": r["email"],
			"estimated_hours_per_day": r["estimated_hours_per_day"],
			"extra_notes": r["extra_notes"],
			"extra_price_increase": r["extra_price_increase"],
			"flat_rate": r["flat_rate"],
			"idx": r["idx"],
			"is_single_share": r["is_single_share"],
			"job_duration": r["job_duration"],
			"job_site": r["job_site"],
			"job_title": r["job_title"],
			"name": r["name"],
			"naming_series": r["naming_series"],
			"no_of_workers": r["no_of_workers"],
			"order_status": r["order_status"],
			"owner": r["owner"],
			"parent": r["parent"],
			"parentfield": r["parentfield"],
			"parenttype": r["parenttype"],
			"per_hour": r["per_hour"],
			"phone_number": r["phone_number"],
			"rate": r["rate"],
			"require_staff_to_wear_face_mask": r["require_staff_to_wear_face_mask"],
			"resumes_required": r["resumes_required"],
			"select_job": r["select_job"],
			"shovel": r["shovel"],
			"staff_company": r["staff_company"],
			"staff_org_claimed": r["staff_org_claimed"],
			"worker_filled": r["worker_filled"],
			"_assign": r["_assign"],
			"_comments": r["_comments"],
			"_liked_by": r["_liked_by"],
			"_user_tags": r["_user_tags"]
		}
	})
	frappe.set_route("Form", "Job Order", "new-job-order")
}
