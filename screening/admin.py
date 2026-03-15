from django.contrib import admin

from screening.models import Prediction


@admin.register(Prediction)
class PredictionAdmin(admin.ModelAdmin):
    list_display = ("stock", "module_type", "score", "confidence", "label", "created_at")
    list_filter = ("module_type", "label")
    search_fields = ("stock__symbol",)
    date_hierarchy = "created_at"
