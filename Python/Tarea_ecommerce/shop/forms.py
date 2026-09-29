from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User

from .models import Address, Customer


class RegisterForm(UserCreationForm):
    email = forms.EmailField(label="Correo electronico")
    first_name = forms.CharField(label="Nombre", max_length=150)
    last_name = forms.CharField(label="Apellido", max_length=150)

    class Meta:
        model = User
        fields = ["first_name", "last_name", "username", "email", "password1", "password2"]

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data["email"]
        if commit:
            user.save()
            Customer.objects.create(user=user, name=f"{user.first_name} {user.last_name}".strip(), email=user.email)
        return user


class CustomerProfileForm(forms.ModelForm):
    class Meta:
        model = Customer
        fields = ["name", "email", "address", "locality", "province", "postal_code"]
        labels = {"name": "Nombre completo", "address": "Direccion", "locality": "Localidad", "province": "Provincia", "postal_code": "Codigo postal"}
        widgets = {"address": forms.TextInput(), "email": forms.EmailInput()}


class AddressForm(forms.ModelForm):
    class Meta:
        model = Address
        fields = ["label", "name", "address", "locality", "province", "postal_code"]
        labels = {"label": "Etiqueta", "name": "Destinatario", "address": "Direccion", "locality": "Localidad", "province": "Provincia", "postal_code": "Codigo postal"}


class CheckoutForm(AddressForm):
    payment_method = forms.ChoiceField(label="Medio de pago", choices=[("card", "Tarjeta (simulacion)"), ("transfer", "Transferencia")])

    class Meta(AddressForm.Meta):
        fields = ["name", "address", "locality", "province", "postal_code"]