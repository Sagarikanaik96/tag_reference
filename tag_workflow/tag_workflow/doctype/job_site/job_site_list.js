frappe.listview_settings['Job Site'] = {
	onload:function(){
		$('h3[title = "Job Site"]').html('Job Sites');
		if(frappe.session.user!='Administrator'){
			$('.custom-actions.hidden-xs.hidden-md').hide();
			$('[data-original-title="Refresh"]').hide();
            $('.menu-btn-group').hide();
        }
    },
	refresh: function(listview){
		$('#navbar-breadcrumbs > li:nth-child(2) > a').html('Job Sites');
		$('[data-original-title="ID"]>input').attr('placeholder', 'Name');
		listview.columns[0].df.label='Name';
		listview.render_header(listview.columns);
	}
}