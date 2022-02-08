// Copyright (c) 2022, SourceFuse and contributors
// For license information, please see license.txt

frappe.ui.form.on('Claim Order', {
	after_save:function(frm){
		staffing_claim_joborder(frm)
	},
	before_save:function(frm){
		if (!frm.doc.hiring_organization){
			frappe.msgprint(__("Your claim is Not completed please try again from from Job Order"));
			frappe.validated = false
		}
		frm.set_value('approved_no_of_workers',0)
	},
	validate: function(frm) {
		let no_of_worker = frm.doc.no_of_workers_joborder
		let claim_no = frm.doc.staff_claims_no
		if(claim_no > no_of_worker){
			frappe.msgprint(__("Claims Is Not Greater Than No Of Workers Required"));
            frappe.validated = false;
		}
	},
	staff_claims_no:function(frm){
		let no_of_workers = frm.doc.staff_claims_no
		if (no_of_workers && isNaN(no_of_workers)){
			frappe.msgprint({message: __('Not valid Integer digit'), indicator: 'red'})
			frappe.validated = false
		}

	},
	refresh:function(frm){
		$('[data-label="Save"]').text("Submit Claim")
		if(frm.doc.__islocal==1){
			frm.set_df_property('approved_no_of_workers', "hidden", 1);
			cancel_claimorder(frm);
		}
	},
	setup:function(frm){
		frm.set_query("staffing_organization", function (doc) {
			return {
			  filters: [
				[
				  "Company",
				  "organization_type",
				  "in",
				  ["Staffing"],
				],
				["Company", "make_organization_inactive", "=", 0],
			  ],
			};
		  });
	}		
});

function staffing_claim_joborder(frm){
	frappe.call({
		"method":"tag_workflow.tag_workflow.doctype.claim_order.claim_order.staffing_claim_joborder",
		"freeze": true,
		"freeze_message": "<p><b>preparing notification for Hiring orgs...</b></p>",
		"args":{
			"job_order" :frm.doc.job_order,"hiring_org" : frm.doc.hiring_organization,"staffing_org" : frm.doc.staffing_organization,"doc_name" : frm.doc.name}
	});
	
}

function cancel_claimorder(frm){
	frm.add_custom_button(__('Cancel'), function(){
		frappe.set_route("Form", "Job Order");
	});
}
