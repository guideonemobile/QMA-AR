
#import "QMAPoi+Create.h"
#import "QMATarget.h"
#import "QMAGalleryItem+Create.h"


@implementation QMAPoi (Create)

+ (QMAPoi *)poiWithIndex:(NSNumber *)index
                andlabel:(NSString *)label
              andBorough:(NSString *)borough
            andImageName:(NSString *)imageName
            andAudioName:(NSString *)audioName
           andPersonName:(NSString *)personName
         andGalleryItems:(NSArray *)galleryItems
        andAboutHTMLFile:(NSString *)aboutHTMLFileName
               forTarget:(QMATarget *)target
  inManagedObjectContext:(NSManagedObjectContext *)moc {
    
    QMAPoi *poi;
    
    NSFetchRequest *request = [NSFetchRequest fetchRequestWithEntityName:@"QMAPoi"];
    request.predicate = [NSPredicate predicateWithFormat:@"target = %@ AND label = %@", target, label];
    NSArray *matches = [moc executeFetchRequest:request error:nil];
    
    if (!matches) {
        QMALog(@"Error: Fetch request failed");
    } else if ([matches count] > 1) {
        QMALog(@"Error: More than one POI with the name '%@' for target '%@'", label, target.label);
    } else if ([matches count] == 1) {
        QMALog(@"A POI named '%@' already exists for target '%@'. Properties updated.", label, target.label);
        poi = [matches firstObject];
    } else {
        poi = [NSEntityDescription insertNewObjectForEntityForName:@"QMAPoi"
                                            inManagedObjectContext:moc];
        poi.label = label;
    }
    
    poi.index = index;
    poi.borough = borough;
    poi.image = imageName;
    poi.audio = audioName;
    poi.personName = personName;
    poi.aboutHTMLFile = aboutHTMLFileName;
    
    //gallery
    for (NSDictionary *dic in galleryItems) {
        if ([dic isKindOfClass:[NSDictionary class]] && dic[@"Image"] && dic[@"Caption"]) {
            [poi addGalleryObject:[QMAGalleryItem galleryItemWithImageName:dic[@"Image"]
                                                                andCaption:dic[@"Caption"]
                                                                    forPOI:poi
                                                    inManagedObjectContext:moc]];
        } else {
            QMALog(@"Each entry in the gallery array should be a dictionary with two entries, 'Image' and 'Caption'");
        }
    }
    
    return poi;
}

- (NSString *)description {
    return [NSString stringWithFormat:@"<%@: %p, %@>", [self class], self, @{@"Index:":self.index, @"Label":self.label, @"Borough":self.borough, @"Image Name":self.image, @"Audio File":self.audio, @"Person Name":self.personName, @"About HTML File Name":self.aboutHTMLFile, @"Gallery Items":@([self.gallery count])}];
}

@end
