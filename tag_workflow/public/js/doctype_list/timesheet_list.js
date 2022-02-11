frappe.listview_settings['Timesheet'] = {
	hide_name_column: true,
	add_fields: ["status", "total_hours", "start_date", "end_date", "from_date", "to_date"],
	right_column: "name",

	refresh: function(listview){
		$('[data-original-title="Menu"]').hide()
		cur_list.page.btn_primary[0].style.display = "none";
	},

	onload: function(listview) {
		cur_list.page.btn_primary[0].style.display = "none";
		if(frappe.boot.tag.tag_user_info.company_type == "Hiring" && frappe.boot.tag.tag_user_info.company){
			listview.page.add_button(__(`<svg class="icon  icon-xs" style=""><use class="" href="#icon-add"></use></svg>Add Timesheet`), function() {
				prepare_timesheet(listview);
			}).addClass("btn-primary");
		}
	}
}

function prepare_timesheet(listview){
	let fields = [
		{
			fieldtype:'Link', fieldname:'employee', reqd: 1, label:'Employee', "options": "Employee", in_list_view: 1,
			get_query: function(){
				return {
					query: "tag_workflow.utils.timesheet.get_timesheet_employee",
					filters: {
						'job_order': cur_dialog.get_value("job_order")
					}
				}
			},
			onchange: function(e){
				dialog.fields_dict.items.df.data.some(d => {
					let employee = d.employee;
					if(employee){
						frappe.db.get_value("Employee", {"name": employee}, "employee_name", function(r){
							d.employee_name = r.employee_name;
							cur_dialog.fields_dict.items.refresh();
						});
					}else{
						d.employee_name = "";
						cur_dialog.fields_dict.items.refresh();
					}
				});
			}
		},
		{fieldtype:'Column Break', fieldname: 'column_1'},
		{fieldtype:'Read Only', fieldname:'employee_name', label:'Employee Name', in_list_view: 1, options: "employee.employee_name"},
		{fieldtype:'Section Break', fieldname: 'section_1', label: "Enter/Exit Time"},
		{
			fieldtype:'Time', fieldname:'enter_time', label:'Enter Time', in_list_view: 1, default: frappe.datetime.now_time(),
			onchange: function(){
				update_hours_child(dialog);
			}
		},
		{fieldtype:'Column Break', fieldname: 'column_2'},
		{
			fieldtype:'Time', fieldname:'exit_time', label:'Exit Time', in_list_view: 1, default: frappe.datetime.now_time(),
			onchange: function(){
				update_hours_child(dialog);
			}
		},
		{fieldtype:'Read Only', fieldname:'total_hours', label:'Total Hours', in_list_view: 1, read_only: 0},
	];
	
	var dialog = new frappe.ui.Dialog({
		title: __('Add Time Log'),
		fields: [
			{
				fieldtype:'Link', fieldname:'job_order', reqd: 1, label:'Job Order', "options": "Job Order",
				get_query: function(){
					return {
						filters: [
							["Job Order", "company", "=", frappe.boot.tag.tag_user_info.company]
						]
					}
				},
				onchange: function(){
					if(cur_dialog){
						get_data();
					}
				}
			},
			{fieldtype:'Column Break', fieldname: 'column'},
			{
				fieldtype:'Date', fieldname: 'posting_date', label: "Date", default: frappe.datetime.now_date(), reqd: 1,
				onchange: function(){
					check_posting_date(dialog);
				}
			},
			{fieldtype:'Section Break', fieldname: 'section_1', label: "Enter/Exit Time"},
			{
				fieldtype:'Time', fieldname:'enter_time', label:'Enter Time', in_list_view: 1, default: frappe.datetime.now_time(), reqd: 1,
				onchange: function(){
					update_hours(dialog);
				}
			},
			{fieldtype:'Column Break', fieldname: 'column_2'},
			{
				fieldtype:'Time', fieldname:'exit_time', label:'Exit Time', in_list_view: 1, default: frappe.datetime.now_time(), reqd: 1,
				onchange: function(){
					update_hours(dialog);
				}
			},
			{fieldtype:'Section Break', fieldname: 'section'},
			{fieldname: "items", fieldtype: "Table", label: "", cannot_add_rows: false, in_place_edit: true, reqd: 1, data: [], fields: fields}
		],
	});

	dialog.set_primary_action(__('Save'), function() {
		let values = dialog.get_values();
		update_timesheet(values);
		dialog.hide();
		cur_list.refresh();
	});

	dialog.set_secondary_action(function(){
		dialog.hide();
	});
	dialog.set_secondary_action_label("Cancel");

	dialog.show();
	dialog.$wrapper.find('.modal-dialog').css('max-width', '880px');
	dialog.$wrapper.find('textarea.input-with-feedback.form-control').css("height", "108px");
}


function get_data(){
	check_posting_date(cur_dialog);
	let order = cur_dialog.get_value("job_order");
	if(order){
		frappe.call({
			method: "tag_workflow.utils.timesheet.get_timesheet_data",
			args: {"job_order": order, "user": frappe.session.user, "company_type": frappe.boot.tag.tag_user_info.company_type},
			callback: function(r){
				let data = r.message || [];
				console.log(data);
				cur_dialog.fields_dict.items.df.data = data;
				cur_dialog.fields_dict.items.refresh();
			}
		});
	}else{
		cur_dialog.fields_dict.items.df.data = [];
		cur_dialog.fields_dict.items.refresh();
	}
}


/*--------------------------*/
function update_hours(dialog){
	check_posting_date(dialog);
	dialog.fields_dict.items.df.data.some(d => {
		let enter = cur_dialog.get_value("enter_time") || null;
		let exit = cur_dialog.get_value("exit_time") || null;
		let hour = Number(d.total_hours) || 0;
		let ent = d.enter_time || null;
		let ext = d.exit_time || null;
		if((enter && exit && hour == 0) || (ent === null || ext === null)){
			var time_start = new Date();
			var time_end = new Date();
			var value_start = enter.split(':');
			var value_end = exit.split(':');
			time_start.setHours(value_start[0], value_start[1], 0, 0);
			time_end.setHours(value_end[0], value_end[1], 0, 0);
			var hours = ((time_end - time_start)/(1000*60*60));
			if(hours >= 0){
				d.total_hours = hours.toFixed(2);
				cur_dialog.fields_dict.items.refresh();
			}else{
				frappe.msgprint("<b>Enter Time</b> must be greater then <b>Exit Time</b>");
				d.total_hours = "0.00";
				cur_dialog.fields_dict.items.refresh();
			}
		}
	});
}

function update_hours_child(dialog){
	check_posting_date(dialog);
	dialog.fields_dict.items.df.data.some(d => {
		let enter = d.enter_time || null;
		let exit = d.exit_time || null;
		let hour = Number(d.total_hours) || 0;
		if(enter && exit){
			var time_start = new Date();
			var time_end = new Date();
			var value_start = enter.split(':');
			var value_end = exit.split(':');
			time_start.setHours(value_start[0], value_start[1], 0, 0);
			time_end.setHours(value_end[0], value_end[1], 0, 0);
			var hours = ((time_end - time_start)/(1000*60*60));
			if(hours >= 0){
				d.total_hours = hours.toFixed(2);
				cur_dialog.fields_dict.items.refresh();
			}else{
				frappe.msgprint("<b>Enter Time</b> must be greater then <b>Exit Time</b>");
				d.total_hours = "0.00";
				cur_dialog.fields_dict.items.refresh();
			}
		}else if(hour <= 0){
			d.total_hours = "0.00";
			cur_dialog.fields_dict.items.refresh();
		}
	});
}


function update_timesheet(values){
	frappe.call({
		method: "tag_workflow.utils.timesheet.update_timesheet_data",
		args: {"data": values, "company": frappe.boot.tag.tag_user_info.company, "company_type": frappe.boot.tag.tag_user_info.company_type, user: frappe.session.user},
		callback: function(r){
			let data = r.message;
			if(data == 1){
				frappe.msgprint("<b>Timesheet</b> updated successfully");
			}else{
				frappe.msgprint("Some errors while updating timesheet. please try again.")
			}
		}
	});
}

/*------------------------------------*/
function check_posting_date(dialog){
	let date = dialog.get_value("posting_date");
	date = new Date(date);
	let order = dialog.get_value("job_order");
	if(order && date){
		frappe.db.get_value("Job Order", {"name": dialog.get_value("job_order")}, ["from_date", "to_date"], function(r){
			let from_date = new Date(r.from_date);
			let to_date = new Date(r.to_date);
			if(date >= from_date && date <= to_date){
				console.log("TAG");
			}else{
				frappe.msgprint("Date must be in between Job order start and end date");
			}
		});
	}
}
