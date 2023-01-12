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
		$(".col.layout-main-section-wrapper, .col-md-12.layout-main-section-wrapper").css("max-width", "89%");
		$(".form-message.blue").css("background", "lightyellow");
		$(".form-message.blue").css("color", "black");
		$(".form-message.blue").css("margin-top", "10px");
		$(".editable-form .layout-main-section-wrapper .layout-main-section, .submitted-form .layout-main-section-wrapper .layout-main-section, #page-Company .layout-main-section-wrapper .layout-main-section, #page-Timesheet .layout-main-section-wrapper .layout-main-section, #page-Lead .layout-main-section-wrapper .layout-main-section");

		frm.set_value("from_time", "");
		frm.set_value("to_time", "");
		frm.set_value("break_from_time", "");
		frm.set_value("break_to_time", "");
		frm.add_custom_button(__('Save'), function() {
			let save=1
			if(frm.doc.job_order && frm.doc.date && frm.doc.from_time && frm.doc.to_time && frm.doc.items){
				updating_page(1)
				update_timesheet(frm,save);
			}
			else{
				updating_page(1)
				update_time_data(frm,save)
			}
		}).addClass("btn-primary");
		frm.add_custom_button(__('Submit Timesheet'), function() {
			let save=0
			updating_page(0)
			update_timesheet(frm,save);
			
		}).addClass("btn-primary btn-submit");

		let jo=localStorage.getItem("order")
		let len_history = frappe.route_history.length;
		if((frappe.route_history.length>=3 && (frappe.route_history[len_history-1][1]=='Add Timesheet') && frappe.boot.tag.tag_user_info.company_type!='Staffing' ) ||  frappe.boot.tag.tag_user_info.company_type=='Staffing' ){
			if(localStorage){
				cur_frm.set_value("job_order", jo);
			}
		}
		else{
			cur_frm.set_value("job_order", '');
		}
		setTimeout(status_field,1000);
		setTimeout(checking_selected_values,2000);
		if(frm.doc.job_order){
			update_title(frm);
		}
		sort_employees(frm);
		$(document).on('click', '[data-fieldname="break_from_time"]', function(){
			$('.datepicker').show()
		});
		$(document).on('click', '[data-fieldname="break_to_time"]', function(){
			$('.datepicker').show()
		});
		setting_job_order_value()
	},

	job_order: function(frm){
		if(frm.doc.job_order){
			set_def_time()
			show_desc(frm);
			update_title(frm);
		}
		else{
			frm.dashboard.set_headline(__());
			frm.dashboard.set_headline(__(`<div style="display: flex;flex-direction: inherit;"><p>Job Order description will be available here...</p></div>`));
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
		else{
			set_def_time()
			cur_frm.clear_table("items");
			cur_frm.refresh_field("items");
		}
	},

	from_time: function(frm){
		check_break_time(frm)
		update_time(frm);
		check_submittable(frm)
	},

	to_time: function(frm){
		check_break_time(frm)
		update_time(frm);
		check_submittable(frm)
	},

	break_from_time: function(frm){
		check_break_time(frm)
		update_time(frm);
		check_btn_submittable(frm)
	},

	break_to_time: function(frm){
		check_break_time(frm)
		update_time(frm);
		check_btn_submittable(frm)
	},
	onload_post_render: function(frm){
		sort_employees(frm);
	}
});

/*---------------------------------*/
function update_title(frm){
	frappe.db.get_value("Job Order", {"name": frm.doc.job_order}, ["select_job", "job_site", "job_order_duration", "per_hour","from_date","to_date","per_hour","flat_rate", "estimated_hours_per_day"], function(r){
		if(r){
			let data = `<div>
					<p><b>Job Title: </b> ${r['select_job']}</p>&nbsp;&nbsp;
					<p><b>Job Site: </b> ${r['job_site']}</p>&nbsp;&nbsp;
					<p><b>Job Duration: </b> ${r['job_order_duration']}</p>&nbsp;&nbsp;
					<p><b>Daily Hours: </b> ${r['estimated_hours_per_day'].toFixed(2)} hrs</p>&nbsp;&nbsp;
					<p><b>Bill Rate: </b>$${r['per_hour'].toFixed(2)}</p>&nbsp;&nbsp;
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
			cur_frm.set_value('from_time','')
			cur_frm.set_value('to_time','')
			cur_frm.set_value('break_from_time','')
			cur_frm.set_value('break_to_time','')
			show_desc(frm);
		}else{
			frappe.msgprint("Date must be in between Job order start and end date");
			frm.set_value("date", "");
		}
	}
}

/*------------------------------------*/
function get_employee_data(frm){
	cur_frm.clear_table("items");
	let timesheet_list=localStorage.getItem("timesheet_to_update")
	frappe.call({
		method: "tag_workflow.utils.timesheet.get_timesheet_data",
		args: {"job_order": frm.doc.job_order, "user": frappe.session.user, "company_type": frappe.boot.tag.tag_user_info.company_type,'date':frm.doc.date,'timesheets_to_update':timesheet_list},
		async: 1,
		freeze: true,
		freeze_message: "Please wait while we are fetching data...",
		callback: function(r){
			if(r){
				localStorage.setItem("timesheet_to_update", '');
				cur_frm.clear_table("items");
				let data = r.message || [];
				for(let d in data){
					let child = frappe.model.get_new_doc("Timesheet Item", cur_frm.doc, "items");
					update_time_values(data,d)			
					$.extend(child, {
						"employee": data[d]['employee'],
						"employee_name": data[d]['employee_name'],
						"company": data[d]['company'],
						"status": data[d]['status'],
						"tip_amount": data[d]['tip_amount'],
						"from_time":data[d]['enter_time'],
						"to_time":data[d]['exit_time'],
						"break_from":data[d]['break_from'],
						"break_to":data[d]['break_to'],
						"hours":data[d]['total_hours'],
						"amount":data[d]['billing_amount'],
						"timesheet_value":data[d]['timesheet_name'],
						"overtime_hours":data[d]['overtime_hours'],
						"overtime_rate":data[d]['overtime_rate'],
					});
				}
				cur_frm.refresh_field("items");
                setTimeout(status_field, 700);
			}
		}
	});
}

/*-------------------------------------*/
cur_frm.fields_dict['items'].grid.get_field('employee').get_query = function(doc){
	return {
		query: "tag_workflow.utils.timesheet.get_timesheet_employee",
		filters: {
			'job_order': doc.job_order
		}
	}
};


/*----------------------------------*/
frappe.ui.form.on("Timesheet Item", {
	items_add: function(_frm, cdt, cdn){
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

	tip_amount: function(frm, cdt, cdn){
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
        check_replaced_emp(child, frm);
		sort_employees(frm);
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
	let hours = 0;
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
	}else{
		make_from_to_zero(child);
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

function make_from_to_zero(child){
	if(!child.from_time){
		frappe.model.set_value(child.doctype, child.name, "from_time", "");
	}else if(!child.to_time){
		frappe.model.set_value(child.doctype, child.name, "to_time", "");
	}
}

function make_break_zero(child){
	frappe.model.set_value(child.doctype, child.name, "break_from", "");
	frappe.model.set_value(child.doctype, child.name, "break_to", "");
}

/*------------------------------------------*/
function get_amount(frm, hours, breaks, child){
	let normal_hours = 0.00;
	let overtime_rate = 0.00;
	let overtime_hours = 0.00;
	let total_hour = hours-breaks;
	let job_order=frm.doc.job_order
	let timesheet_date=frm.doc.date
	let additional_rate=cur_frm.doc.additional_flat_rate
	let per_hour_rate=cur_frm.doc.total_per_hour_rate
	let emp=child.employee
	if(total_hour>0 && frm.doc.from_time && frm.doc.to_time){
		frappe.model.set_value(child.doctype, child.name, "hours", Math.round(total_hour * 100) / 100);
		frappe.call({
			method:'tag_workflow.tag_workflow.doctype.add_timesheet.add_timesheet.update_list_page_calculation',
			args:{timesheet:"None",jo:job_order, timesheet_date:timesheet_date, employee:emp,working_hours:total_hour,total_flat_rate:additional_rate,per_hour_rate:per_hour_rate,from_time:child.from_time},
			callback:function(r){
				if(r.message[1]>0){
						normal_hours = total_hour-r.message[1];
						overtime_hours = r.message[1];
				}else{
					normal_hours = total_hour;
				}		
				if(r.message[1]>0){
					overtime_rate = (cur_frm.doc.total_per_hour_rate*1.5)+cur_frm.doc.additional_flat_rate;
				}
				frappe.model.set_value(child.doctype, child.name, "working_hours", Math.round(normal_hours * 100) / 100);
				frappe.model.set_value(child.doctype, child.name, "overtime_hours", Math.round(overtime_hours * 100) / 100);
				frappe.model.set_value(child.doctype, child.name, "overtime_rate", Math.round(overtime_rate * 100) / 100);
				frappe.model.set_value(child.doctype, child.name, "amount", r.message[0]);
			}
		})
	}
	else{
		frappe.model.set_value(child.doctype, child.name, "hours", Math.round(total_hour * 100) / 100);
		frappe.model.set_value(child.doctype, child.name, "working_hours", Math.round(normal_hours * 100) / 100);
		frappe.model.set_value(child.doctype, child.name, "overtime_hours", 0);
		frappe.model.set_value(child.doctype, child.name, "overtime_rate", 0);
		frappe.model.set_value(child.doctype, child.name, "amount", 0);
	}
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
function update_timesheet(frm,save){
	if(frm.doc.job_order && frm.doc.date && frm.doc.from_time && frm.doc.to_time && frm.doc.items){
		let items = frm.doc.items || [];
		let cur_selected = cur_frm.get_selected();
		let job_order = frm.doc.job_order;
		let date = frm.doc.date;
		let from_time = frm.doc.from_time;
		let to_time = frm.doc.to_time;
		let break_from_time = frm.doc.break_from_time;
		let break_to_time = frm.doc.break_to_time;
		frappe.call({
			method: "tag_workflow.tag_workflow.doctype.add_timesheet.add_timesheet.update_timesheet",
			args: {"user": frappe.session.user, "company_type": frappe.boot.tag.tag_user_info.company_type, "items": items,"cur_selected":cur_selected, "job_order": job_order, "date": date, "from_time": from_time, "to_time": to_time, "break_from_time": break_from_time, "break_to_time": break_to_time,"save":save},
			async: 1,
			freeze: true,
			freeze_message: "Please wait while we are adding timesheet(s)...",
		});
	}else{
		frappe.msgprint({message: __("(*) fields are required"), title: __('Mandatory'), indicator: 'red'});
	}
}

function show_desc(frm){
	if(frm.doc.job_order && frm.doc.date){
		update_title(frm);
		get_employee_data(frm);
	}else{
		frm.dashboard.set_headline(__());
		frm.dashboard.set_headline(__(`<div style="display: flex;flex-direction: inherit;"><p>Job Order description will be available here...</p></div>`));
		cur_frm.clear_table("items");
		cur_frm.refresh_field("items");
	}
}

function status_field(){
    let items = cur_frm.doc.items || [];
    for(let i in items){
        if(items[i].status != "Replaced"){
            cur_frm.fields_dict['items'].grid.get_grid_row(items[i].name).columns.status.df.options = "\nDNR\nNo Show\nNon Satisfactory";
            cur_frm.fields_dict['items'].grid.get_grid_row(items[i].name).refresh();
        }
    }
}

function check_replaced_emp(child, frm){
    if(child.employee){
        frappe.call({
            "method": "tag_workflow.tag_workflow.doctype.add_timesheet.add_timesheet.checkreplaced_emp",
            "args": {"employee": child.employee, "job_order": frm.doc.job_order},
            "callback": function(r){
                if(r){
                    let result = r.message;
                    if(result == 0){
                        cur_frm.fields_dict['items'].grid.get_grid_row(child.name).columns.status.df.options = "\nDNR\nNo Show\nNon Satisfactory";
                        cur_frm.fields_dict['items'].grid.get_grid_row(child.name).refresh();
                        frappe.model.set_value(child.doctype, child.name, "status", "");
                    }else{
                        cur_frm.fields_dict['items'].grid.get_grid_row(child.name).columns.status.df.options = "\nDNR\nNo Show\nNon Satisfactory\nReplaced";
                        cur_frm.fields_dict['items'].grid.get_grid_row(child.name).refresh();
                        frappe.model.set_value(child.doctype, child.name, "status", "Replaced");
                    }
                }
            }
        });
    }
}
function check_availability(r,frm){
	const weekday = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
	if(r['availability']=='Mon-Fri'){
		const f_d = new Date(frm.doc.date);
		let day = weekday[f_d.getDay()];
		const my_days=["Monday","Tuesday","Wednesday","Thursday","Friday"]
		if(!my_days.includes(day)){
			frappe.msgprint('The job order is available from Monday To Friday')
			frm.set_value("date", "");			
		}
	}
	else if(r['availability']=='Sat & Sun'){
		const avl_days=['Saturday','Sunday']
		const f_d = new Date(frm.doc.date);
		let day = weekday[f_d.getDay()];
		if(!avl_days.includes(day)){
			frappe.msgprint('The job order is available only for Saturday and Sunday')
			frm.set_value("date", "");
		}
	}
	else if(r['availability']=='Custom'){
		const selected=r['selected_days']
		const f_d = new Date(frm.doc.date);
		let day = weekday[f_d.getDay()];
		const my_days=selected.split(", ")
		if(!my_days.includes(day)){
			frappe.msgprint('The job order is available only for '+my_days)
			frm.set_value("date", "");
		}
	}
}

function sort_employees(frm){
	let idx = 1;
	frm.doc.items.sort(function(a,b){
		if(a.company && b.company){
			if(a.company.toLowerCase() < b.company.toLowerCase()){
				return -1;
			}
			else if(a.company.toLowerCase() > b.company.toLowerCase()){
				return 1;
			}
			else{
				if(a.employee_name.toLowerCase() < b.employee_name.toLowerCase()){
					return -1;
				}
				else if(a.employee_name.toLowerCase() > b.employee_name.toLowerCase()){
					return 1;
				}
			}
		}
	});
	frm.doc.items.map(function(item){
		item.idx = idx++;
	});
	frm.refresh_field('items');
}
function check_submittable(frm){
	if(frm.doc.from_time && frm.doc.to_time){
		$('button.btn.btn-default.ellipsis.btn-primary.btn-submit').prop('disabled', false);
	}
	else if(!(frm.doc.from_time || frm.doc.to_time ) && frm.doc.break_from_time && frm.doc.break_to_time ){
		$('button.btn.btn-default.ellipsis.btn-primary.btn-submit').prop('disabled', false);

	}
	else{
		$('button.btn.btn-default.ellipsis.btn-primary.btn-submit').prop('disabled', true);

	}
}
function check_btn_submittable(frm){
	if(frm.doc.break_from_time && frm.doc.break_to_time ){
		$('button.btn.btn-default.ellipsis.btn-primary.btn-submit').prop('disabled', false);
	}
	else if(!(frm.doc.break_from_time || frm.doc.break_to_time ) && frm.doc.from_time && frm.doc.to_time ){
		$('button.btn.btn-default.ellipsis.btn-primary.btn-submit').prop('disabled', false);

	}
	else{
		$('button.btn.btn-default.ellipsis.btn-primary.btn-submit').prop('disabled', true);

	}
}

/*--------------------------------------------------*/
function update_save_timesheet(frm,save){
	if(frm.doc.job_order && frm.doc.items && frm.doc.date &&(frm.doc.from_time || frm.doc.to_time || frm.doc.break_from_time || frm.doc.break_to_time )){
		let items = frm.doc.items || [];
		let cur_selected = cur_frm.get_selected();
		let job_order = frm.doc.job_order;
		let date = frm.doc.date;
		let from_time = frm.doc.from_time ? frm.doc.from_time:frm.doc.to_time  ;
		let to_time = frm.doc.to_time ? frm.doc.to_time:frm.doc.from_time;
		update_timesheet_save(items,cur_selected,job_order,date,from_time,to_time,save)
	}else{
		frappe.msgprint({message: __("(*) fields are required"), title: __('Mandatory'), indicator: 'red'});
	}
}
function update_timesheet_save(items,cur_selected,job_order,date,from_time,to_time,save){
	let break_from_time = cur_frm.doc.break_from_time ? cur_frm.doc.break_from_time:'';
	let break_to_time = cur_frm.doc.break_to_time ? cur_frm.doc.break_to_time:'';
	if((!from_time && !to_time) || (from_time.length==0 && to_time.length==0)){
		from_time='0:00:00'
		to_time='0:00:00'
	}
	if(break_from_time && (break_to_time).length==0){
		break_to_time=break_from_time
	}
	if(break_to_time && (break_from_time).length==0){
		break_from_time=break_to_time
	}
	frappe.call({
		method: "tag_workflow.tag_workflow.doctype.add_timesheet.add_timesheet.update_timesheet",
		args: {"user": frappe.session.user, "company_type": frappe.boot.tag.tag_user_info.company_type, "items": items,"cur_selected":cur_selected, "job_order": job_order, "date": date, "from_time": from_time, "to_time": to_time, "break_from_time": break_from_time, "break_to_time": break_to_time,"save":save},
		async: 1,
		freeze: true,
		freeze_message: "Please wait while we are adding timesheet(s)...",
	});
}

/*------------------------------------------*/
function update_time_data(frm,save){
	let err
	err=check_from_to_timesheet_hour_value(frm)
	check_break_from_to_timesheet_value(frm)
	let employees=[]
	let item = frm.doc.items || [];
	if(item.length>0){
		for(let i in item){
			employees.push(item[i].employee_name)
		}
	}	
	let current_date=moment(frm.doc.date)
	if(err==1 && frm.doc.date<frm.doc.to_date){
		let next_date=current_date.add(1, 'days')
		frappe.msgprint({message: __("Timesheet values has crossed midnight. Please create a separate timesheet for "+next_date.date()+"-"+current_date.format('MMMM')+"-"+next_date.year() +" for "+employees), title: __('Midnight Timesheet'), indicator: 'red'});
	}
	else if(err==2 && frm.doc.date>frm.doc.from_date){
		let past_date=current_date.subtract(1, 'days')
		frappe.msgprint({message: __("Timesheet values has crossed midnight. Please create a separate timesheet for "+past_date.date()+"-"+past_date.format('MMMM')+"-"+past_date.year() +" for "+employees), title: __('Midnight Timesheet'), indicator: 'red'});
	}
	setTimeout(function(){
		update_save_timesheet(frm,save)
	},1000)
}
function update_time_values(data,d){
	if(!(cur_frm.doc.from_time)){
		cur_frm.set_value('from_time',data[d]['enter_time'])
	}
	if(!(cur_frm.doc.to_time)){
		cur_frm.set_value('to_time',data[d]['exit_time'])
	}
	if(!(cur_frm.doc.break_from_time)){
		cur_frm.set_value('break_from_time',data[d]['break_from'])
	}
	if(!(cur_frm.doc.break_to_time)){
		cur_frm.set_value('break_to_time',data[d]['break_to'])
	}		
}
function set_def_time(){
	cur_frm.set_value("from_time", "");
	cur_frm.set_value("to_time", "");
	cur_frm.set_value("break_from_time", "");
	cur_frm.set_value("break_to_time", "");
}
function checking_selected_values(){
	cur_frm.set_value('date','')
	if(localStorage.getItem('date')!='' && localStorage.getItem('date')!= null){
		let jo=localStorage.getItem("job_order")
		let date=localStorage.getItem("date")
		cur_frm.set_value('job_order',jo)
		cur_frm.set_value('date',date)
		localStorage.setItem("job_order", '');
        localStorage.setItem("date", '');
	}
}
function check_break_time(frm){
	if(frm.doc.from_time && frm.doc.to_time){
		if(frm.doc.break_from_time && (frm.doc.break_from_time<frm.doc.from_time || frm.doc.break_from_time>frm.doc.to_time) ){
			$('.datepicker.active').hide();
			frm.set_value('break_from_time','')
			frappe.msgprint({message: __("Break Start Time should be between Start time and End time"), title: __('Break Time Error'), indicator: 'red'});
			frappe.validated=false;
		}
		if(frm.doc.break_to_time && (frm.doc.break_to_time<frm.doc.from_time || frm.doc.break_to_time>frm.doc.to_time) ){
			$('.datepicker.active').hide();
			frm.set_value('break_to_time','')
			frappe.msgprint({message: __("Break End Time should be between Start time and End time"), title: __('Break Time Error'), indicator: 'red'});
			frappe.validated=false;
		}
	}
}
function check_from_to_timesheet_hour_value(frm){
	let est_hours=frm.doc.estimated_daily_hours
	let daily_hrs
	if(Number.isInteger(est_hours)){
		daily_hrs=(est_hours).toString()+'.00'
	}
	else{
		daily_hrs=est_hours.toFixed(2)
	}
	let dat=(daily_hrs.toString()).split('.')
	let my_hours=parseInt(dat[0]*60)
	let my_minutes=parseFloat(dat[1])*.60
	let minutes_value=my_hours+my_minutes
	let midnight
	if(frm.doc.from_time && !frm.doc.to_time){
		let new_end_time=moment(frm.doc.from_time, 'HH:mm').add(minutes_value, 'minutes').format('HH:mm:ss')
		if(new_end_time<frm.doc.from_time){
			frm.set_value('to_time','23:59:00');
			midnight=1
		}
		else{
			frm.set_value('to_time',new_end_time);

		}
	}
	else if(frm.doc.to_time && !frm.doc.from_time){
		let new_from_time=moment(frm.doc.to_time, 'HH:mm').subtract(minutes_value, 'minutes').format('HH:mm:ss')
		if(new_from_time>frm.doc.to_time){
			frm.set_value('from_time','00:00:00');
			midnight=2
		}
		else{
			frm.set_value('from_time',new_from_time);

		}
	}
	return midnight

}
function check_break_from_to_timesheet_value(frm){
	let extra_break_time=15
	if(frm.doc.break_from_time && !frm.doc.break_to_time){
		let new_break_end_time=moment(frm.doc.break_from_time, 'HH:mm').add(extra_break_time, 'minutes').format('HH:mm:ss')
		if(new_break_end_time<frm.doc.break_from_time){
			frm.set_value('break_to_time','23:59:00');
		}
		else{
			frm.set_value('break_to_time',new_break_end_time);
		}
	}
	else if(frm.doc.break_to_time && !frm.doc.break_from_time){
		let new_break_from_time=moment(frm.doc.break_to_time, 'HH:mm').subtract(extra_break_time, 'minutes').format('HH:mm:ss')
		if(new_break_from_time>frm.doc.break_to_time){
			frm.set_value('break_from_time','00:00:00');
		}
		else{
			frm.set_value('break_from_time',new_break_from_time);
		}
	}
	if(frm.doc.break_from_time && frm.doc.break_to_time && !(frm.doc.from_time && frm.doc.to_time)){
		frm.set_value('from_time',frm.doc.break_from_time);
		frm.set_value('to_time',frm.doc.break_to_time);
	}	

}
function updating_page(t){
	let time_after=5000
	if(t==0){
		time_after=3000
	}
	setTimeout(function(){
		if(!cur_dialog){
			frappe.msgprint({message: __("Timesheet(s) has been added successfully"), title: __('Successful'), indicator: 'green'});
			window.location.reload()
		}
	},time_after)
}