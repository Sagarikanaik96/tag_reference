// Copyright (c) 2022, SourceFuse and contributors
// For license information, please see license.txt

frappe.ui.form.on('Claim Order', {
	after_save:function(frm){
		staffing_claim_joborder(frm)
	},
	before_save:function(frm){
		if (!frm.doc.hiring_organization){
			frappe.msgprint(__("Your claim is not completed. Please try again!"));
			frappe.validated = false
			setTimeout(() => {
				frappe.set_route("Form","Job Order", frm.doc.job_order)
			}, 3000);
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
		$('.form-footer').hide()
		if(frm.doc.__islocal==1){
			if (!frm.doc.hiring_organization){
                frappe.msgprint(__("Your claim is not completed. Please try again from Job Order!"));
                frappe.validated = false
                setTimeout(() => {
                    frappe.set_route("List","Job Order")
                }, 3000);
			}    
			frm.set_df_property('approved_no_of_workers', "hidden", 1);
			cancel_claimorder(frm);
			submit_claim(frm);
			if(frappe.boot.tag.tag_user_info.company_type=='Staffing'){
				setTimeout(()=>{org_info(frm);},500)	
			}
		}
		else{
			let company_field = [
				"job_order","staffing_organization","agree_to_contract","e_signature","staff_claims_no"
			  ];
			  for (let f in company_field) {
				cur_frm.toggle_enable(company_field[f], 0);
			  }
		}

	},
	setup:function(frm){
		$('[data-label="Save"]').hide()
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

function submit_claim(frm){
	frm.add_custom_button(__('Submit Claim'), function(){
		frm.save()
	}).addClass("btn btn-primary btn-sm primary-action");
}

function staffing_claim_joborder(frm){
	frappe.call({
		"method":"tag_workflow.tag_workflow.doctype.claim_order.claim_order.staffing_claim_joborder",
		"freeze": true,
		"freeze_message": "<p><b>preparing notification for Hiring orgs...</b></p>",
		"args":{
			"job_order" :frm.doc.job_order,"hiring_org" : frm.doc.hiring_organization,"staffing_org" : frm.doc.staffing_organization,"doc_name" : frm.doc.name,"single_share":frm.doc.single_share,'no_assigned':frm.doc.staff_claims_no,'no_required':frm.doc.no_of_workers_joborder},
		callback:function(r){
				setTimeout(function () {
					window.location.href='/app/job-order/'+frm.doc.job_order
				}, 3000);
			}
	});
	
}

function cancel_claimorder(frm){
	frm.add_custom_button(__('Cancel'), function(){
		frappe.set_route("Form", "Job Order");
	});
}

function org_info(frm){
	frappe.call({
		'method':"tag_workflow.tag_data.hiring_org_name",
		'args':{'current_user':frappe.session.user},
		callback:function(r){
			if(r.message=='success'){
				frm.set_value('staffing_organization',frappe.boot.tag.tag_user_info.company)
			}
			else{
				frm.set_value('staffing_organization','')
			}
		}	
	})
}
