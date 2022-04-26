frappe.listview_settings["Staffing Email"] = {
    onload:function(){
        if(frappe.session.user != 'Administrator'){
            $('[data-original-title="Refresh"]').hide()
            $('.menu-btn-group').hide()
        }
        $('[data-original-title = "Name"]').hide();
    },
    refresh: function(){
        if(frappe.session.user != 'Administrator'){
            $('div.custom-actions.hidden-xs.hidden-md > div > button').hide();
        }
        $('[title = "Staffing Email"]').html('Emails');
        $('#navbar-breadcrumbs > li:nth-child(2) > a:nth-child(1)').html('Emails');
        $('[data-label = "Add Staffing Email"]').text('Draft Email');
    },
    hide_name_column: true
} 