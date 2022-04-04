frappe.listview_settings["Item"] = {
  hide_name_column: true,
  onload:function() {
    frappe.route_options = {
      "company": "",
      };
  },
  refresh:function(){
    $('div[data-fieldname="company"]').hide();
    $('div[data-fieldname="item_group"]').hide();
    $('div[data-fieldname="variant_of"]').hide();
   
  },
};
