// Copyright (c) 2021, SourceFuse and contributors
// For license information, please see license.txt

// frappe.ui.form.on('Job Order', {
// 	// refresh: function(frm) {

// 	// }
// });
frappe.ui.form.on('Job Order', {
	refresh: function(frm) {
		if(frm.doc.__islocal == 1 || cur_frm.doc.owner == frappe.session.user){
			cur_frm.toggle_display("apply_for_quotation_section", 0);
		}else if(frm.doc.worker_filled >= frm.doc.no_of_workers){
			cur_frm.toggle_display("apply_for_quotation_section", 0);
		}
	},
	
	create_quotation: function(frm){
		if(frm.doc.__islocal != 1 && cur_frm.doc.owner != frappe.session.user && frm.doc.worker_filled < frm.doc.no_of_workers){
			if(cur_frm.is_dirty()){
				frappe.msgprint({message: __('Please save the form before creating Quotation'), title: __('Save Job Order'), indicator: 'red'});
			}else{
				make_quotation(frm);
			}
		}else if(frm.doc.worker_filled >= frm.doc.no_of_workers){
			frappe.msgprint({message: __('No of workers already filled for this job order'), title: __('Worker Filled'), indicator: 'red'});
		}
	},

	drug_screen: function(frm){
		update_flat_rate(frm);
	},

	driving_record: function(frm){
		update_flat_rate(frm);
	},

	background_check: function(frm){
		update_flat_rate(frm);
	},

	shovel: function(frm){
		update_flat_rate(frm);
	},	
});


/*----------flat_rate--------*/
function update_flat_rate(frm){
	var drug = frm.doc.drug_screen;
	var driving = frm.doc.driving_record;
	var backcheck = frm.doc.background_check;
	var shovel = frm.doc.shovel;

	let flat_total = 0;


}

/*----------------prepare quote--------------*/
function make_quotation(frm){
	var company = frappe.defaults.get_user_default("company") || '';

	if(company){
		frappe.db.get_value("Quotation", {"company": company, "job_order": frm.doc.name}, ["name", "docstatus"], function(r){
			console.log(r);
			if(r && r.name && r.docstatus != 2){
				frappe.msgprint({message: __(`A Quotation(<a href="/app/quotation/${r.name}" style="color:#5292f7;"><b>${r.name}</b></a>) has already beed submitted by <b>${company}</b> for this Job Order.`), title: __('Proposal Already Sent'), indicator: 'orange'});
			}else if(r && r.name && r.docstatus == 2){
				redirect_quotation(frm);
			}else{
				redirect_quotation(frm);
			}
		});
	}else{
		redirect_quotation(frm);
	}
}

function redirect_quotation(frm){
	var doc = frappe.model.get_new_doc("Quotation");
	var child = frappe.model.get_new_doc("Quotation Item", doc, "items");

	doc.quotation_to = "Customer";
	doc.party_name = frm.doc.company;
	doc.transaction_date = frappe.datetime.now_date();
	doc.order_type = "Sales";
	doc.company =  frappe.defaults.get_user_default("company") || '';
	doc.job_order = frm.doc.name;
	doc.naming_series = "SAL-QTN-.YYYY.-";
	doc.selling_price_list = "Standard Selling";

	$.extend(child, {
		"item_code": frm.doc.select_job,
		"item_name": frm.doc.select_job,
		"qty": frm.doc.no_of_workers - frm.doc.worker_filled,
		"description": frm.doc.select_job,
		"uom": "Nos",
		"conversion_factor": 1,
		"stock_qty": 1
	});

	frappe.set_route("app", "quotation", doc.name);
}


frappe.ui.form.on("Quotation",{
	before_submit: function(frm){
		console.log('before submit')
		console.log(frappe.user_roles.includes("Hiring Admin"))
		if(frappe.user_roles.includes("Hiring Admin") || frappe.user_roles.includes("Hiring User"))
		{
			console.log('hiring')
			frappe.call({
				method:"tag_workflow.tag_data.submit_values",
				args:{
					'job_order_name':cur_frm.doc.job_order,
					'quotation_number':cur_frm.doc.name
				},
				callback:function(r){
					if(r.message!="success")
					{
						msgprint("One Quotation is already submitted");
						frappe.validated = false;

					}
				}
			})
		}
		else if(frappe.user.has_role!="Hiring Admin" || frappe.user.has_role!="Hiring User"){
			console.log(cur_frm.doc.name)
			msgprint("You Don't have permission to submit the quotation");
			frappe.validated = false;
		}
		
		
		
	}
})
// frappe.ui.form.on("Quotation",{
// 	after_save: function(frm){
// 		console.log('hello')
// 		if(cur_frm.doc.job_order)
// 		{
// 			frappe.call({
// 				method:"tag_workflow.tag_data.assign_quotation",
// 				args:{
// 					'quotation_name':cur_frm.doc.name,
// 					'job_order_name':cur_frm.doc.job_order
// 				},
// 				callback:function(r){
// 					console.log(r.message)
// 				}
// 			})
// 		}
// 	}
	

// })
frappe.ui.form.on("Quotation",{
	"on_submit":function(frm)
	{
		console.log('fadhubhfvghvdasx')
		console.log(cur_frm.doc.name)
		frappe.call({
			method:"tag_workflow.tag_data.update_job_order",
			args:{
				'quotation_name':cur_frm.doc.name,
				'job_order_name':cur_frm.doc.job_order
			},
			callback:function(r){
				console.log(r.message)
			}
		})
	}
})


frappe.ui.form.on("Job Order", "refresh", function(frm) {
	console.log(frappe.defaults.get_user_default("company"))
	cur_frm.fields_dict['employee_details'].grid.get_field('employee').get_query = function(doc, cdt, cdn) {
		return {
			filters:[
				['company', '=', frappe.defaults.get_user_default("company")]
			]
		}
	}
});

