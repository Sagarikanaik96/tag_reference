// Copyright (c) 2022, SourceFuse and contributors
// For license information, please see license.txt

frappe.ui.form.on('Add Timesheet', {
	refresh: function(frm) {
		if(frappe.boot.tag.tag_user_info.company_type=='Staffing'){
				frappe.db.get_value("Company", {"parent_staffing": frappe.boot.tag.tag_user_info.company},['name'], function(r){
					if(!r.name){
						window.location.href='/app/job-order'
					}
				});
		}
		cur_frm.disable_save();
		frm.dashboard.set_headline(__(`<div style="display: flex;flex-direction: inherit;"><p>Job Order description will be available here...</p></div>`));
		$(".help-box.small.text-muted").css("display", "none");
		$(".col.layout-main-section-wrapper, .col-md-12.layout-main-section-wrapper").css("max-width", "95%");
		$(".form-message.blue").css("background", "lightyellow");
		$(".form-message.blue").css("color", "black");
		$(".form-message.blue").css("margin-top", "10px");
		$(".editable-form .layout-main-section-wrapper .layout-main-section, .submitted-form .layout-main-section-wrapper .layout-main-section, #page-Company .layout-main-section-wrapper .layout-main-section, #page-Timesheet .layout-main-section-wrapper .layout-main-section, #page-Lead .layout-main-section-wrapper .layout-main-section").css("max-width", "100%");

		frm.set_value("from_time", "");
		frm.set_value("to_time", "");
		frm.set_value("break_from_time", "");
		frm.set_value("break_to_time", "");
		frm.add_custom_button(__('Submit Timesheet'), function() {
			update_timesheet(frm);
		}).addClass("btn-primary");

		let jo=localStorage.getItem("order")
		if(localStorage){
			cur_frm.set_value("job_order", jo);
		}
	},

	job_order: function(frm){
		if(frm.doc.job_order){
			frm.trigger("date");
			update_title(frm);
			get_employee_data(frm);
		}else{
			frm.dashboard.set_headline(__());
			frm.dashboard.set_headline(__(`<div style="display: flex;flex-direction: inherit;"><p>Job Order description will be available here...</p></div>`));
			cur_frm.clear_table("items");
			cur_frm.refresh_field("items");
		}
	},
	setup:function(frm){
		frm.set_query("job_order", function(){
			return {
				query: "tag_workflow.tag_workflow.doctype.add_timesheet.add_timesheet.job_order_name",
				filters: {
					"company_type": frappe.boot.tag.tag_user_info.company_type,
					"company":frappe.boot.tag.tag_user_info.company
				}	
			}
		});
	},

	date: function(frm){
		if(frm.doc.date){
			check_date(frm);
		}
	},

	from_time: function(frm){
		update_time(frm);
	},

	to_time: function(frm){
		update_time(frm);
	},

	break_from_time: function(frm){
		update_time(frm);
	},

	break_to_time: function(frm){
		update_time(frm);
	}
});

/*---------------------------------*/
function update_title(frm){
	frappe.db.get_value("Job Order", {"name": frm.doc.job_order}, ["select_job", "job_site", "job_order_duration", "per_hour","from_date","to_date","per_hour","flat_rate", "estimated_hours_per_day"], function(r){
		if(r){
			let data = `<div style="display: flex;flex-direction: inherit;">
					<p><b>Job Title: </b> ${r['select_job']}</p>&nbsp;&nbsp;
					<p><b>Job Site: </b> ${r['job_site']}</p>&nbsp;&nbsp;
					<p><b>Job Duration: </b> ${r['job_order_duration']}</p>&nbsp;&nbsp;
					<p><b>Daily Hour: </b> ${r['estimated_hours_per_day'].toFixed(2)} hrs</p>&nbsp;&nbsp;
					<p><b>Rate Per Hour: </b>$${r['per_hour'].toFixed(2)}</p>&nbsp;&nbsp;
					<p><b>Flat Rate: </b>$${r['flat_rate'].toFixed(2)}</p>&nbsp;&nbsp;
					<p><b>From Date: </b> ${r['from_date']}</p>&nbsp;&nbsp;
					<p><b>To Date: </b> ${r['to_date']}</p>
				</div>`;
			frm.dashboard.set_headline(__());
			frm.dashboard.set_headline(data);
		}
	});
}

/*------------------------------------*/
function check_date(frm){
	if(frm.doc.from_date && frm.doc.to_date){
		if(frm.doc.date > frappe.datetime.now_date()){
			frappe.msgprint("Date can't be future date.");
			frm.set_value("date", "");
		}else if(frm.doc.date >= frm.doc.from_date && frm.doc.date <= frm.doc.to_date){
			console.log("TAG");
		}else{
			frappe.msgprint("Date must be in between Job order start and end date");
			frm.set_value("date", "");
		}
	}
}

/*------------------------------------*/
function get_employee_data(frm){
	cur_frm.clear_table("items");
	frappe.call({
		method: "tag_workflow.utils.timesheet.get_timesheet_data",
		args: {"job_order": frm.doc.job_order, "user": frappe.session.user, "company_type": frappe.boot.tag.tag_user_info.company_type},
		async: 1,
		freeze: true,
		freeze_message: "Please wait while we are fetching data...",
		callback: function(r){
			if(r){
				let data = r.message || [];
				for(let d in data){
					let child = frappe.model.get_new_doc("Timesheet Item", cur_frm.doc, "items");
					$.extend(child, {
						"employee": data[d]['employee'],
						"employee_name": data[d]['employee_name'],
						"company": data[d]['company']
					});
				}
				cur_frm.refresh_field("items");
				update_time(frm);
			}
		}
	});
}

/*-------------------------------------*/
cur_frm.fields_dict['items'].grid.get_field('employee').get_query = function(doc, cdt, cdn){
	return {
		query: "tag_workflow.utils.timesheet.get_timesheet_employee",
		filters: {
			'job_order': doc.job_order
		}
	}
};


/*----------------------------------*/
frappe.ui.form.on("Timesheet Item", {
	items_add: function(frm, cdt, cdn){
		let child = frappe.get_doc(cdt, cdn);
		frappe.model.set_value(child.doctype, child.name, "company", "");
	},

	from_time: function(frm, cdt, cdn){
		let child = frappe.get_doc(cdt, cdn);
		update_child_time(child, frm);
	},

	to_time: function(frm, cdt, cdn){
		let child = frappe.get_doc(cdt, cdn);
		update_child_time(child, frm);
	},

	break_from: function(frm, cdt, cdn){
		let child = frappe.get_doc(cdt, cdn);
		update_child_time(child, frm);
	},

	break_to: function(frm, cdt, cdn){
		let child = frappe.get_doc(cdt, cdn);
		update_child_time(child, frm);
	},

	status: function(frm, cdt, cdn){
		let child = frappe.get_doc(cdt, cdn);
		update_child_time(child, frm);
	},

	employee: function(frm, cdt, cdn){
		let child = frappe.get_doc(cdt, cdn);
		add_pre_data(child, frm);
	}
});

/*-----------------------------------------*/
function add_pre_data(child, frm){
	if(frm.doc.from_time && frm.doc.to_time){
		frappe.model.set_value(child.doctype, child.name, "from_time", frm.doc.from_time);
		frappe.model.set_value(child.doctype, child.name, "to_time", frm.doc.to_time);
	}

	if(frm.doc.break_from_time && frm.doc.break_to_time){
		frappe.model.set_value(child.doctype, child.name, "break_from", frm.doc.break_from_time);
		frappe.model.set_value(child.doctype, child.name, "break_to", frm.doc.break_to_time);
	}
}

/*-----------------------------------------*/
function update_child_time(child, frm){
	let hours = child.hours;
	let breaks = 0;
	let time_start = new Date();
	let time_end = new Date();
	let break_start = new Date();
	let break_end = new Date();

	if(child.from_time && child.to_time){
		let value_start = child.from_time.split(':');
		let value_end = child.to_time.split(':');
		
		time_start.setHours(value_start[0], value_start[1], 0, 0);
		time_end.setHours(value_end[0], value_end[1], 0, 0);
		hours = ((time_end - time_start)/(1000*60*60));
		if(hours <= 0){
			hours = 0;
		}
	}

	if(child.break_from && child.break_to && child.from_time && child.to_time){
		let bvalue_start = child.break_from.split(':');
		let bvalue_end = child.break_to.split(':');

		break_start.setHours(bvalue_start[0], bvalue_start[1], 0, 0);
		break_end.setHours(bvalue_end[0], bvalue_end[1], 0, 0);
		let break_s = ((break_end - break_start)/(1000*60*60));
		
		if(break_s < 0){
			make_break_zero(child);
		}else if(break_start >= time_start && break_start <= time_end && break_end <= time_end && break_end >= time_start && break_start <= break_end){
			breaks = break_s;
		}else{
			make_break_zero(child);
		}
	}

	if(child.status != "No Show"){
		get_amount(frm, hours, breaks, child);
	}else{
		frappe.model.set_value(child.doctype, child.name, "hours", 0);
		frappe.model.set_value(child.doctype, child.name, "amount", 0);
	}
}

function make_break_zero(child){
	frappe.model.set_value(child.doctype, child.name, "break_from", "");
	frappe.model.set_value(child.doctype, child.name, "break_to", "");
}

/*------------------------------------------*/
function get_amount(frm, hours, breaks, child){
	let normal_amount = 0.00;
	let normal_hours = 0.00;
	let overtime_amount = 0.00;
	let overtime_rate = 0.00;
	let overtime_hours = 0.00;
	let total_hour = hours-breaks;

	if(total_hour > frm.doc.estimated_daily_hours){
		normal_hours = frm.doc.estimated_daily_hours;
		overtime_hours = total_hour-frm.doc.estimated_daily_hours;
	}else{
		normal_hours = total_hour;
	}

	normal_amount = (normal_hours*cur_frm.doc.total_per_hour_rate)+cur_frm.doc.additional_flat_rate;

	if(overtime_hours > 0){
		overtime_amount = (overtime_hours*cur_frm.doc.total_per_hour_rate*1.5)+cur_frm.doc.additional_flat_rate;
		overtime_rate = cur_frm.doc.total_per_hour_rate*1.5;
	}

	frappe.model.set_value(child.doctype, child.name, "hours", Math.round(total_hour * 100) / 100);
	frappe.model.set_value(child.doctype, child.name, "working_hours", Math.round(normal_hours * 100) / 100);
	frappe.model.set_value(child.doctype, child.name, "overtime_hours", Math.round(overtime_hours * 100) / 100);
	frappe.model.set_value(child.doctype, child.name, "overtime_rate", Math.round(overtime_rate * 100) / 100);
	frappe.model.set_value(child.doctype, child.name, "amount", normal_amount+overtime_amount);
}


/*------------------------------------------*/
function update_time(frm){
	let item = frm.doc.items || [];
	for(let i in item){
		if(frm.doc.from_time && frm.doc.to_time){
			frappe.model.set_value(item[i].doctype, item[i].name, "from_time", frm.doc.from_time);
			frappe.model.set_value(item[i].doctype, item[i].name, "to_time", frm.doc.to_time);
		}else{
			frappe.model.set_value(item[i].doctype, item[i].name, "from_time", "");
			frappe.model.set_value(item[i].doctype, item[i].name, "to_time", "");
		}

		if(frm.doc.break_from_time && frm.doc.break_to_time){
			frappe.model.set_value(item[i].doctype, item[i].name, "break_from", frm.doc.break_from_time);
			frappe.model.set_value(item[i].doctype, item[i].name, "break_to", frm.doc.break_to_time);
		}else{
			frappe.model.set_value(item[i].doctype, item[i].name, "break_from", "");
			frappe.model.set_value(item[i].doctype, item[i].name, "break_to", "");
		}
	}
}

/*--------------------------------------------------*/
function update_timesheet(frm){
	if(frm.doc.job_order && frm.doc.date && frm.doc.from_time && frm.doc.to_time && frm.doc.items){
		let items = frm.doc.items || [];
		let job_order = frm.doc.job_order;
		let date = frm.doc.date;
		let from_time = frm.doc.from_time;
		let to_time = frm.doc.to_time;
		let break_from_time = frm.doc.break_from_time;
		let break_to_time = frm.doc.break_to_time;

		frappe.call({
			method: "tag_workflow.tag_workflow.doctype.add_timesheet.add_timesheet.update_timesheet",
			args: {"user": frappe.session.user, "company_type": frappe.boot.tag.tag_user_info.company_type, "items": items, "job_order": job_order, "date": date, "from_time": from_time, "to_time": to_time, "break_from_time": break_from_time, "break_to_time": break_to_time},
			async: 1,
			freeze: true,
			freeze_message: "Please wait while we are adding timesheet(s)...",
			callback: function(r){
				if(r){
					if(r.message == 1){
						frappe.msgprint({message: __("Timesheet(s) has been added successfully"), title: __('Successful'), indicator: 'green'});
						cur_frm.reload_doc();
					}
				}
			}
		});
	}else{
		frappe.msgprint({message: __("(*) fields are required"), title: __('Mandatory'), indicator: 'red'});
	}
}
