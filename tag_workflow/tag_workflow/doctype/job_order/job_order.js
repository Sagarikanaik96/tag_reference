// Copyright (c) 2021, SourceFuse and contributors
// For license information, please see license.txt

// frappe.ui.form.on('Job Order', {
// 	// refresh: function(frm) {

// 	// }
// });
frappe.ui.form.on('Job Order', {	
	assign_employees: function(frm){
		if(frm.doc.__islocal != 1 && cur_frm.doc.owner != frappe.session.user && frm.doc.worker_filled < frm.doc.no_of_workers){
			if(cur_frm.is_dirty()){
				frappe.msgprint({message: __('Please save the form before creating Quotation'), title: __('Save Job Order'), indicator: 'red'});
			}else{
				assign_employe(frm);
			}
		}else if(frm.doc.worker_filled >= frm.doc.no_of_workers){
			frappe.msgprint({message: __('No of workers already filled for this job order'), title: __('Worker Filled'), indicator: 'red'});
		}
	},	
	onload:function(frm)
   {
       if(frappe.user_roles.includes("Hiring User") || frappe.user_roles.includes("Hiring Admin"))
       {
           var company_name=frappe.defaults.get_user_default("company")
           frappe.call({
               method:"tag_workflow.tag_data.company_details",
               args:{
                   'company_name':company_name,
               },
               callback:function(r){
                   if (r.message!="success")
                   {
                       msgprint("You can't Create Job Order Unless Your Company Details are Complete");
                       frappe.validated = false;
                   }
               }
              
           })
       }
 
   },
   before_save:function(frm)
   {
       if(frappe.user_roles.includes("Hiring User") || frappe.user_roles.includes("Hiring Admin"))
       {
           var company_name=frappe.defaults.get_user_default("company")
           frappe.call({
               method:"tag_workflow.tag_data.company_details",
               args:{
                   'company_name':company_name,
               },
               callback:function(r){
                   if (r.message!="success")
                   {
                       msgprint("You can't Create Job Order Unless Your Company Details are Complete");
                       frappe.validated = false;
                   }
               }
              
           })
       }
 
   }

});



/*----------------prepare quote--------------*/
function assign_employe(frm){
	var company = frappe.defaults.get_user_default("company") || '';
	if(company){
		frappe.db.get_value("Quotation", {"company": company, "job_order": frm.doc.name}, ["name", "docstatus"], function(r){
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
	var doc = frappe.model.get_new_doc("Assign Employee");
	var staff_company=frappe.defaults.get_user_defaults("company")
	console.log(staff_company[0])
	doc.transaction_date = frappe.datetime.now_date();
	doc.staffing_organization = staff_company[0]  ;
	doc.job_order = frm.doc.name;
	doc.no_of_employee_required=frm.doc.no_of_workers-frm.doc.worker_filled;
	doc.hiring_organization = frm.doc.company;
	frappe.set_route("Form", "Assign Employee", doc.name);
 }

