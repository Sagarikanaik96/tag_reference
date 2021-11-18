frappe.ui.form.on("Employee", {
	resresh: function(frm){
		var hide_values = ["naming_series"];
		trigger_hide(hide_values, frm);
	}
});


/*----------hide field----------*/
function trigger_hide(hide_values, frm){
	for(var val in hide_values){
		cur_frm.toggle_display(hide_values[val], 0);
	}
}
