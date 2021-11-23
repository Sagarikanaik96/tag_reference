frappe.ui.form.on("Timesheet", {
	refresh: function(frm){
		var timesheet_fields = ["naming_series", "customer", "status", "company", "currency", "exchange_rate", "employee"];
		hide_timesheet_field(timesheet_fields);
		check_update_timesheet(frm);
	},
	setup: function(frm){
		job_order_details(frm);
		frm.set_query("job_order_detail", function(){
			return {
				filters: [
					["Job Order", "company", "=", frm.doc.company]
				]
			}
		});
	},

	job_order_detail: function(frm){
		job_order_details(frm);
		update_job_detail(frm);
	}
});


function job_order_details(frm){
	if(frm.doc.job_order_detail){
		frappe.db.get_value("Job Order", {"name": frm.doc.job_order_detail}, ["job_title", "job_site", "job_duration", "per_hour"], function(r){
			if(r){
				let data = `
					<p><b>Job Title: </b> ${r['job_title']}</p>
					<p><b>Job Site: </b> ${r['job_site']}</p>
					<p><b>Job Duration: </b> ${r['job_duration']}</p>
					<p><b>Rate Per Hour: </b> ${r['per_hour']}</p>
				`;
				frm.set_df_property("job_details", "options", data);
			}
		});
	}else{
		frm.set_df_property("job_details", "options", "");
	}
}

/*-----------timesheet-----------------*/
function check_update_timesheet(frm){
	if(frm.doc.workflow_state == "Approval Request"){
		frappe.call({method: "tag_workflow.utils.timesheet.send_timesheet_for_approval",args: {"employee": frm.doc.employee, "docname": frm.doc.name}});
	}
}


/*----------hide field----------------*/
function hide_timesheet_field(fields){
	for(let val in fields){
		cur_frm.toggle_display(fields[val], 0);
	}
}

function update_job_detail(frm){
	if (cur_frm.doc.job_order_detail){
		frappe.call({
			method:"tag_workflow.tag_data.update_timesheet",
			args:{'job_order_detail':cur_frm.doc.job_order_detail},
			callback:function(r){
				if(r.message){
					cur_frm.get_field("time_logs").grid.grid_rows[0].doc.activity_type = r.message[0];
					cur_frm.get_field("time_logs").grid.grid_rows[0].doc.from_time = r.message[1];
					cur_frm.get_field("time_logs").grid.grid_rows[0].refresh_field("activity_type");
					cur_frm.get_field("time_logs").grid.grid_rows[0].refresh_field("from_time");
				}
			}
		});
	}
}
