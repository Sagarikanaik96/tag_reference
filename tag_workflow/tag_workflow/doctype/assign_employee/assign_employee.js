// // Copyright (c) 2021, SourceFuse and contributors
// // For license information, please see license.txt

 
frappe.ui.form.on('Assign Employee', {
	refresh: function(frm) {
		if(cur_frm.doc.workflow_state=="Approved")
		{
			if (cur_frm.doc.modified.substring(11,19)==frappe.datetime.now_time())
			{
				frappe.call({
					method:"tag_workflow.tag_data.update_job_order",
					args:{
						job_name:cur_frm.doc.job_order,
						employee_filled:cur_frm.doc.employee_details.length
					},
					callback:function(r){
						console.log(r.message)
					}

				})
			}
			
		}
  
	},
	after_save:function(frm){
		frappe.call({
			method:"tag_workflow.tag_data.receive_hiring_notification",
			args:{
				hiring_org:cur_frm.doc.hiring_organization,
				job_order:cur_frm.doc.job_order,
				staffing_org:cur_frm.doc.staffing_organization,
				emp_detail:cur_frm.doc.employee_details,
				doc_name :cur_frm.doc.name
			},
			

		})
	}
 });
 