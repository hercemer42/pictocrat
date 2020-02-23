import 'zone.js/dist/zone-mix'
import 'reflect-metadata'
import 'polyfills'
import { BrowserModule } from '@angular/platform-browser'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { HttpClientModule } from '@angular/http'

import { AppComponent } from './app.component'
import { HomeComponent } from './components/home/home.component'
import { SettingsComponent } from './components/settings/settings.component'

import { AppRoutingModule } from './app-routing.module'

import { ElectronService } from './providers/electron.service'
import { UiService } from './services/ui.service'

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    SettingsComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule
  ],
  providers: [ElectronService, UiService],
  bootstrap: [AppComponent]
})
export class AppModule { }
