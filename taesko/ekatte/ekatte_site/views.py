from django.http import HttpResponse
from django.template import loader
from . import models

# Create your views here.


def index(request):
    search = request.GET.get('search', None)
    search = [search] if search else None
    template = loader.get_template('ekatte_site/index.html')
    totals = [models.total(models.Municipalities), models.total(models.Provinces), models.total(models.Ekatte)]
    rows = list(models.full_ekatte_data(search))
    context = {
        'db_object_total': sum(totals),
        'db_municipality_total': totals[0],
        'db_province_total': totals[1],
        'db_ekatte_total': totals[2],
        'table_data_headers': rows[0],
        'table_data': rows[1]
    }
    return HttpResponse(template.render(context, request))
