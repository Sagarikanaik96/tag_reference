frappe.listview_settings['Employee Onboarding'] = {
    hide_name_column: true,
    onload: (listview)=>{
        [listview.columns[4],listview.columns[5]] = [listview.columns[5], listview.columns[4]];
        listview.render_header(listview);
    }
}