frappe.ui.form.on("Salary Slip", {

    start_date: function(frm) {
		if (frm.doc.start_date) {
			frm.trigger("set_end_date");
		}
		setTimeout(() => {
			set_new_total(frm);
		}, 1000);
    },
    employee: function(frm) {
		frm.events.get_emp_and_working_day_details(frm);
        setTimeout(() => {
			set_new_total(frm);
		}, 1000);
	},
    end_date: function(frm) {
		frm.events.get_emp_and_working_day_details(frm);
        setTimeout(() => {
			set_new_total(frm);
		}, 1000);
	},
    refresh:function(frm){
        if(frm.doc.status =='Draft' && frm.doc.salary_structure == "Temporary Employees_"+frappe.boot.tag.tag_user_info.company){
            set_new_total(frm);
        }
        if(frm.doc.salary_structure == "Temporary Employees_"+frappe.boot.tag.tag_user_info.company){
            frm.set_df_property('hour_rate', 'hidden', 1)
        }
    },


});

function set_new_total(frm){
	if (frm.doc.docstatus === 0 && frm.doc.doctype === "Salary Slip") {
		if (frm.doc.earnings || frm.doc.deductions) {
			frappe.call({
				method: "set_totals",
				doc: frm.doc,
				callback: function() {
					frm.refresh_fields();
				}
			});
		}
	}
};