frappe.ui.form.on("Item", {
	onload: function(frm){
		if(cur_frm.is_dirty()){
			cur_frm.set_value("item_group", "Services");
			cur_frm.set_value("is_stock_item", 0);
			cur_frm.set_value("include_item_in_manufacturing", 0);
			cur_frm.set_value("stock_uom", "Nos");
		}
	}
});
